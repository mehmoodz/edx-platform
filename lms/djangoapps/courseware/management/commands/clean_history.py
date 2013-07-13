"""A command to clean the StudentModuleHistory table.

When we added XBlock storage, each field modification wrote a new history row
to the db.  Now that we have bulk saves to avoid that database hammering, we
need to clean out the unnecessary rows from the database.

This command that does that.

"""

import datetime

from optparse import make_option

from django.core.management.base import NoArgsCommand
from django.db import connection


class Command(NoArgsCommand):
    """The actual clean_history command to clean history rows."""

    help = "Deletes unneeded rows from the StudentModuleHistory table."

    option_list = NoArgsCommand.option_list + (
        make_option(
            '--dry-run',
            action='store_true',
            default=False,
            help="Don't change the database, just show what would be done.",
        ),
    )

    def handle_noargs(self, **options):
        smhc = StudentModuleHistoryCleaner(
            dry_run=options["dry_run"],
            verbosity=int(options["verbosity"]),
        )
        smhc.main()


class StudentModuleHistoryCleaner(object):
    """Logic to clean rows from the StudentModuleHistory table."""

    DELETE_GAP_SECS = 0.5   # Rows this close can be discarded.

    def __init__(self, dry_run=False, verbosity=1):
        self.dry_run = dry_run
        self.verbosity = verbosity

    def main(self):
        print self.dry_run
        self.say("Hello!")
        print connection.is_managed()

    def say(self, msg):
        print msg

    def get_history_for_student_modules(self, student_module_id):
        cursor = connection.cursor()
        cursor.execute("""
            SELECT id, created FROM courseware_studentmodulehistory
            WHERE student_module_id = %s
            ORDER BY created
            """,
            [student_module_id]
        )
        history = cursor.fetchall()
        return history

    def delete_history(self, ids_to_delete):
        cursor = connection.cursor()
        cursor.execute("""
            DELETE FROM courseware_studentmodulehistory
            WHERE id IN ({ids})
            """.format(ids=",".join(str(i) for i in ids_to_delete))
        )

    def clean_one_student_module(self, student_module_id):
        """Clean one StudentModule's-worth of history.

        `student_module_id`: the id of the StudentModule to process.

        """
        delete_gap = datetime.timedelta(seconds=self.DELETE_GAP_SECS)

        history = self.get_history_for_student_modules(student_module_id)
        if not history:
            self.say("No history for student_module_id {}".format(student_module_id))
            return

        ids_to_delete = []
        next_created = None
        for history_id, created in reversed(history):
            if next_created is not None:
                # Compare this timestamp with the next one.
                if (next_created - created) < delete_gap:
                    # This row is followed closely by another, we can discard
                    # this one.
                    ids_to_delete.append(history_id)

            next_created = created

        verb = "Would have deleted" if self.dry_run else "Deleting"
        self.say("{verb} {to_delete} rows of {total} for student_module_id {id}".format(
            verb=verb,
            to_delete=len(ids_to_delete),
            total=len(history),
            id=student_module_id,
        ))

        if not self.dry_run:
            self.delete_history(ids_to_delete)
