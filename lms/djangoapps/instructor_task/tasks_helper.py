"""
This file contains tasks that are designed to perform background operations on the
running state of a course.

"""
import json
from json import JSONEncoder
from time import time
from sys import exc_info
from traceback import format_exc

from celery import current_task
from celery.utils.log import get_task_logger
from celery.signals import worker_process_init
from celery.states import SUCCESS, FAILURE

from django.contrib.auth.models import User
from django.db import transaction, reset_queries
from dogapi import dog_stats_api

from xmodule.course_module import CourseDescriptor
from xmodule.modulestore.django import modulestore

import mitxmako.middleware as middleware
from track.views import task_track

from courseware.grades import grade_as_task
from courseware.models import StudentModule, OfflineComputedGrade
from courseware.model_data import ModelDataCache
from courseware.module_render import get_module_for_descriptor_internal
from instructor_task.models import InstructorTask, PROGRESS

# define different loggers for use within tasks and on client side
TASK_LOG = get_task_logger(__name__)

# define value to use when no task_id is provided:
UNKNOWN_TASK_ID = 'unknown-task_id'


def initialize_mako(sender=None, conf=None, **kwargs):
    """
    Get mako templates to work on celery worker server's worker thread.

    The initialization of Mako templating is usually done when Django is
    initializing middleware packages as part of processing a server request.
    When this is run on a celery worker server, no such initialization is
    called.

    To make sure that we don't load this twice (just in case), we look for the
    result: the defining of the lookup paths for templates.
    """
    if 'main' not in middleware.lookup:
        TASK_LOG.info("Initializing Mako middleware explicitly")
        middleware.MakoMiddleware()

# Actually make the call to define the hook:
worker_process_init.connect(initialize_mako)


class UpdateProblemModuleStateError(Exception):
    """
    Error signaling a fatal condition while updating problem modules.

    Used when the current module cannot be processed and no more
    modules should be attempted.
    """
    pass


def _get_current_task():
    """Stub to make it easier to test without actually running Celery"""
    return current_task


def perform_enrolled_student_update(course_id, _module_state_key, student_identifier, update_fcn, action_name, filter_fcn):
    """
    """
    # Throw an exception if _module_state_key is specified, because that's not meaningful here
    if _module_state_key is not None:
        raise ValueError("Value for problem_url not expected")

    # Get start time for task:
    start_time = time()

    # Find the course descriptor.
    # Depth is set to zero, to indicate that the number of levels of children
    # for the modulestore to cache should be infinite.  If the course is not found,
    # let it throw the exception.
    course_loc = CourseDescriptor.id_to_location(course_id)
    course_descriptor = modulestore().get_instance(course_id, course_loc, depth=0)

    enrolled_students = User.objects.filter(courseenrollment__course_id=course_id).prefetch_related("groups").order_by('username')

    # Give the option of updating an individual student. If not specified,
    # then updates all students who have enrolled in the course
    student = None
    if student_identifier is not None:
        # if an identifier is supplied, then look for the student,
        # and let it throw an exception if none is found.
        if "@" in student_identifier:
            student = User.objects.get(email=student_identifier)
        elif student_identifier is not None:
            student = User.objects.get(username=student_identifier)

    if student is not None:
        enrolled_students = enrolled_students.filter(id=student.id)

    if filter_fcn is not None:
        enrolled_students = filter_fcn(enrolled_students)

    # perform the main loop
    num_updated = 0
    num_attempted = 0
    num_total = enrolled_students.count()

    def get_task_progress():
        """Return a dict containing info about current task"""
        current_time = time()
        progress = {'action_name': action_name,
                    'attempted': num_attempted,
                    'updated': num_updated,
                    'total': num_total,
                    'duration_ms': int((current_time - start_time) * 1000),
                    }
        return progress

    task_progress = get_task_progress()
    _get_current_task().update_state(state=PROGRESS, meta=task_progress)
    for enrolled_student in enrolled_students:
        num_attempted += 1
        # There is no try here:  if there's an error, we let it throw, and the task will
        # be marked as FAILED, with a stack trace.
        with dog_stats_api.timer('instructor_tasks.student.time.step', tags=['action:{name}'.format(name=action_name)]):
            if update_fcn(course_descriptor, enrolled_student):
                # If the update_fcn returns true, then it performed some kind of work.
                # Logging of failures is left to the update_fcn itself.
                num_updated += 1

        # update task status:
        task_progress = get_task_progress()
        _get_current_task().update_state(state=PROGRESS, meta=task_progress)

    return task_progress


def perform_module_state_update(course_id, module_state_key, student_identifier, update_fcn, action_name, filter_fcn):
    """
    Performs generic update by visiting StudentModule instances with the update_fcn provided.

    StudentModule instances are those that match the specified `course_id` and `module_state_key`.
    If `student_identifier` is not None, it is used as an additional filter to limit the modules to those belonging
    to that student. If `student_identifier` is None, performs update on modules for all students on the specified problem.

    If a `filter_fcn` is not None, it is applied to the query that has been constructed.  It takes one
    argument, which is the query being filtered, and returns the filtered version of the query.

    The `update_fcn` is called on each StudentModule that passes the resulting filtering.
    It is passed three arguments:  the module_descriptor for the module pointed to by the
    module_state_key, the particular StudentModule to update, and the xmodule_instance_args being
    passed through.  If the value returned by the update function evaluates to a boolean True,
    the update is successful; False indicates the update on the particular student module failed.
    A raised exception indicates a fatal condition -- that no other student modules should be considered.

    The return value is a dict containing the task's results, with the following keys:

          'attempted': number of attempts made
          'updated': number of attempts that "succeeded"
          'total': number of possible subtasks to attempt
          'action_name': user-visible verb to use in status messages.  Should be past-tense.
              Pass-through of input `action_name`.
          'duration_ms': how long the task has (or had) been running.

    Because this is run internal to a task, it does not catch exceptions.  These are allowed to pass up to the
    next level, so that it can set the failure modes and capture the error trace in the InstructorTask and the
    result object.

    """
    # get start time for task:
    start_time = time()

    # find the problem descriptor:
    module_descriptor = modulestore().get_instance(course_id, module_state_key)

    # find the module in question
    modules_to_update = StudentModule.objects.filter(course_id=course_id,
                                                     module_state_key=module_state_key)

    # give the option of updating an individual student. If not specified,
    # then updates all students who have responded to a problem so far
    student = None
    if student_identifier is not None:
        # if an identifier is supplied, then look for the student,
        # and let it throw an exception if none is found.
        if "@" in student_identifier:
            student = User.objects.get(email=student_identifier)
        elif student_identifier is not None:
            student = User.objects.get(username=student_identifier)

    if student is not None:
        modules_to_update = modules_to_update.filter(student_id=student.id)

    if filter_fcn is not None:
        modules_to_update = filter_fcn(modules_to_update)

    # perform the main loop
    num_updated = 0
    num_attempted = 0
    num_total = modules_to_update.count()

    def get_task_progress():
        """Return a dict containing info about current task"""
        current_time = time()
        progress = {'action_name': action_name,
                    'attempted': num_attempted,
                    'updated': num_updated,
                    'total': num_total,
                    'duration_ms': int((current_time - start_time) * 1000),
                    }
        return progress

    task_progress = get_task_progress()
    _get_current_task().update_state(state=PROGRESS, meta=task_progress)
    for module_to_update in modules_to_update:
        num_attempted += 1
        # There is no try here:  if there's an error, we let it throw, and the task will
        # be marked as FAILED, with a stack trace.
        with dog_stats_api.timer('instructor_tasks.module.time.step', tags=['action:{name}'.format(name=action_name)]):
            if update_fcn(module_descriptor, module_to_update):
                # If the update_fcn returns true, then it performed some kind of work.
                # Logging of failures is left to the update_fcn itself.
                num_updated += 1

        # update task status:
        task_progress = get_task_progress()
        _get_current_task().update_state(state=PROGRESS, meta=task_progress)

    return task_progress


def run_update_task(entry_id, visit_fcn, update_fcn, action_name, filter_fcn):
    """
    TODO: UPDATE THIS DOCSTRING

    Performs generic update by visiting StudentModule instances with the update_fcn provided.

    The `entry_id` is the primary key for the InstructorTask entry representing the task.  This function
    updates the entry on success and failure of the perform_module_state_update function it
    wraps.  It is setting the entry's value for task_state based on what Celery would set it to once
    the task returns to Celery:  FAILURE if an exception is encountered, and SUCCESS if it returns normally.
    Other arguments are pass-throughs to perform_module_state_update, and documented there.

    If no exceptions are raised, a dict containing the task's result is returned, with the following keys:

          'attempted': number of attempts made
          'updated': number of attempts that "succeeded"
          'total': number of possible subtasks to attempt
          'action_name': user-visible verb to use in status messages.  Should be past-tense.
              Pass-through of input `action_name`.
          'duration_ms': how long the task has (or had) been running.

    Before returning, this is also JSON-serialized and stored in the task_output column of the InstructorTask entry.

    If an exception is raised internally, it is caught and recorded in the InstructorTask entry.
    This is also a JSON-serialized dict, stored in the task_output column, containing the following keys:

           'exception':  type of exception object
           'message': error message from exception object
           'traceback': traceback information (truncated if necessary)

    Once the exception is caught, it is raised again and allowed to pass up to the
    task-running level, so that it can also set the failure modes and capture the error trace in the
    result object that Celery creates.

    """

    # get the InstructorTask to be updated.  If this fails, then let the exception return to Celery.
    # There's no point in catching it here.
    entry = InstructorTask.objects.get(pk=entry_id)

    # get inputs to use in this task from the entry:
    task_id = entry.task_id
    course_id = entry.course_id
    task_input = json.loads(entry.task_input)
    module_state_key = task_input.get('problem_url')
    student_ident = task_input.get('student')

    # construct log message:
    fmt = 'task "{task_id}": course "{course_id}" problem "{state_key}"'
    task_info_string = fmt.format(task_id=task_id, course_id=course_id, state_key=module_state_key)

    TASK_LOG.info('Starting update (nothing %s yet): %s', action_name, task_info_string)

    # Now that we have an entry we can try to catch failures:
    task_progress = None
    try:
        # Check that the task_id submitted in the InstructorTask matches the current task
        # that is running.
        request_task_id = _get_current_task().request.id
        if task_id != request_task_id:
            fmt = 'Requested task did not match actual task "{actual_id}": {task_info}'
            message = fmt.format(actual_id=request_task_id, task_info=task_info_string)
            TASK_LOG.error(message)
            raise UpdateProblemModuleStateError(message)

        # Now do the work:
        with dog_stats_api.timer('instructor_tasks.time.overall', tags=['action:{name}'.format(name=action_name)]):
            task_progress = visit_fcn(course_id, module_state_key, student_ident, update_fcn, action_name, filter_fcn)
        # If we get here, we assume we've succeeded, so update the InstructorTask entry in anticipation.
        # But we do this within the try, in case creating the task_output causes an exception to be
        # raised.
        entry.task_output = InstructorTask.create_output_for_success(task_progress)
        entry.task_state = SUCCESS
        entry.save_now()

    except Exception:
        # try to write out the failure to the entry before failing
        _, exception, traceback = exc_info()
        traceback_string = format_exc(traceback) if traceback is not None else ''
        TASK_LOG.warning("background task (%s) failed: %s %s", task_id, exception, traceback_string)
        entry.task_output = InstructorTask.create_output_for_failure(exception, traceback_string)
        entry.task_state = FAILURE
        entry.save_now()
        raise

    # Release any queries that the connection has been hanging onto:
    reset_queries()

    # log and exit, returning task_progress info as task result:
    TASK_LOG.info('Finishing %s: final: %s', task_info_string, task_progress)
    return task_progress


def _get_task_id_from_xmodule_args(xmodule_instance_args):
    """Gets task_id from `xmodule_instance_args` dict, or returns default value if missing."""
    return xmodule_instance_args.get('task_id', UNKNOWN_TASK_ID) if xmodule_instance_args is not None else UNKNOWN_TASK_ID


def _get_xqueue_callback_url_prefix(xmodule_instance_args):
    """

    """
    return xmodule_instance_args.get('xqueue_callback_url_prefix', '') if xmodule_instance_args is not None else ''


def _get_track_function_for_task(student, xmodule_instance_args=None, source_page='x_module_task'):
    """
    Make a tracking function that logs what happened.

    For insertion into ModuleSystem, and used by CapaModule, which will
    provide the event_type (as string) and event (as dict) as arguments.
    The request_info and task_info (and page) are provided here.
    """
    # get request-related tracking information from args passthrough, and supplement with task-specific
    # information:
    request_info = xmodule_instance_args.get('request_info', {}) if xmodule_instance_args is not None else {}
    task_info = {'student': student.username, 'task_id': _get_task_id_from_xmodule_args(xmodule_instance_args)}

    return lambda event_type, event: task_track(request_info, task_info, event_type, event, page=source_page)


def _get_module_instance_for_task(course_id, student, module_descriptor, xmodule_instance_args=None,
                                  grade_bucket_type=None):
    """
    Fetches a StudentModule instance for a given `course_id`, `student` object, and `module_descriptor`.

    `xmodule_instance_args` is used to provide information for creating a track function and an XQueue callback.
    These are passed, along with `grade_bucket_type`, to get_module_for_descriptor_internal, which sidesteps
    the need for a Request object when instantiating an xmodule instance.
    """
    # reconstitute the problem's corresponding XModule:
    model_data_cache = ModelDataCache.cache_for_descriptor_descendents(course_id, student, module_descriptor)

    return get_module_for_descriptor_internal(student, module_descriptor, model_data_cache, course_id,
                                              _get_track_function_for_task(student, xmodule_instance_args),
                                              _get_xqueue_callback_url_prefix(xmodule_instance_args),
                                              grade_bucket_type=grade_bucket_type)


@transaction.autocommit
def rescore_problem_module_state(xmodule_instance_args, module_descriptor, student_module):
    '''
    Takes an XModule descriptor and a corresponding StudentModule object, and
    performs rescoring on the student's problem submission.

    Throws exceptions if the rescoring is fatal and should be aborted if in a loop.
    In particular, raises UpdateProblemModuleStateError if module fails to instantiate,
    or if the module doesn't support rescoring.

    Returns True if problem was successfully rescored for the given student, and False
    if problem encountered some kind of error in rescoring.
    '''
    # unpack the StudentModule:
    course_id = student_module.course_id
    student = student_module.student
    module_state_key = student_module.module_state_key
    instance = _get_module_instance_for_task(course_id, student, module_descriptor, xmodule_instance_args, grade_bucket_type='rescore')

    if instance is None:
        # Either permissions just changed, or someone is trying to be clever
        # and load something they shouldn't have access to.
        msg = "No module {loc} for student {student}--access denied?".format(loc=module_state_key,
                                                                             student=student)
        TASK_LOG.debug(msg)
        raise UpdateProblemModuleStateError(msg)

    if not hasattr(instance, 'rescore_problem'):
        # This should also not happen, since it should be already checked in the caller,
        # but check here to be sure.
        msg = "Specified problem does not support rescoring."
        raise UpdateProblemModuleStateError(msg)

    result = instance.rescore_problem()
    if 'success' not in result:
        # don't consider these fatal, but false means that the individual call didn't complete:
        TASK_LOG.warning(u"error processing rescore call for course {course}, problem {loc} and student {student}: "
                         "unexpected response {msg}".format(msg=result, course=course_id, loc=module_state_key, student=student))
        return False
    elif result['success'] not in ['correct', 'incorrect']:
        TASK_LOG.warning(u"error processing rescore call for course {course}, problem {loc} and student {student}: "
                         "{msg}".format(msg=result['success'], course=course_id, loc=module_state_key, student=student))
        return False
    else:
        TASK_LOG.debug(u"successfully processed rescore call for course {course}, problem {loc} and student {student}: "
                       "{msg}".format(msg=result['success'], course=course_id, loc=module_state_key, student=student))
        return True


@transaction.autocommit
def reset_attempts_module_state(xmodule_instance_args, _module_descriptor, student_module):
    """
    Resets problem attempts to zero for specified `student_module`.

    Always returns true, indicating success, if it doesn't raise an exception due to database error.
    """
    problem_state = json.loads(student_module.state) if student_module.state else {}
    if 'attempts' in problem_state:
        old_number_of_attempts = problem_state["attempts"]
        if old_number_of_attempts > 0:
            problem_state["attempts"] = 0
            # convert back to json and save
            student_module.state = json.dumps(problem_state)
            student_module.save()
            # get request-related tracking information from args passthrough,
            # and supplement with task-specific information:
            track_function = _get_track_function_for_task(student_module.student, xmodule_instance_args)
            event_info = {"old_attempts": old_number_of_attempts, "new_attempts": 0}
            track_function('problem_reset_attempts', event_info)

    # consider the reset to be successful, even if no update was performed.  (It's just "optimized".)
    return True


@transaction.autocommit
def delete_problem_module_state(xmodule_instance_args, _module_descriptor, student_module):
    """
    Delete the StudentModule entry.

    Always returns true, indicating success, if it doesn't raise an exception due to database error.
    """
    student_module.delete()
    # get request-related tracking information from args passthrough,
    # and supplement with task-specific information:
    track_function = _get_track_function_for_task(student_module.student, xmodule_instance_args)
    track_function('problem_delete_state', {})
    return True


class GradingJSONEncoder(JSONEncoder):

    def _iterencode(self, obj, markers=None):
        if isinstance(obj, tuple) and hasattr(obj, '_asdict'):
            gen = self._iterencode_dict(obj._asdict(), markers)
        else:
            gen = JSONEncoder._iterencode(self, obj, markers)
        for chunk in gen:
            yield chunk


@transaction.autocommit
def update_offline_grade(xmodule_instance_args, course_descriptor, student):
    """
    Delete the StudentModule entry.

    Always returns true, indicating success, if it doesn't raise an exception due to database error.
    """
    # TODO: this could be made into a global?  Are there threading issues that
    # might arise if we did that?  Savings by pulling it out of this inner loop?
    json_encoder = GradingJSONEncoder()

    # call the main grading function:
    track_function = _get_track_function_for_task(student, xmodule_instance_args)
    xqueue_callback_url_prefix = _get_xqueue_callback_url_prefix(xmodule_instance_args)
    gradeset = grade_as_task(student, course_descriptor, track_function, xqueue_callback_url_prefix)
    json_grades = json_encoder.encode(gradeset)
    offline_grade_entry, created = OfflineComputedGrade.objects.get_or_create(user=student, course_id=course_descriptor.id)
    offline_grade_entry.gradeset = json_grades
    offline_grade_entry.save()

    # Get request-related tracking information from args passthrough,
    # and supplement with task-specific information:
    track_function('offline_grade', {'created': created})

    # Release any queries that the connection has been hanging onto:
    reset_queries()
    return True