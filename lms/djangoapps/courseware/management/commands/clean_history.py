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

    def handle(self, *args, **options):
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

    def clean_one_student_module(self, student_module_id):
        """Clean one StudentModule's-worth of history.

        `student_module_id`: the id of the StudentModule to process.

        """
        delete_gap = datetime.timedelta(seconds=self.DELETE_GAP_SECS)

        cursor = connection.cursor()
        cursor.execute("""
            select id, created from courseware_studentmodulehistory
            where student_module_id = %s
            order by created
            """,
            [student_module_id]
        )
        history = cursor.fetchall()

        if not history:
            print "No history for student_module_id {}".format(student_module_id)
            return

        ids_to_delete = []
        next_created = None
        for id, created in reversed(history):
            if next_created is not None:
                # Compare this timestamp with the next one.
                if (next_created - created) < delete_gap:
                    # This row is followed closely by another, we can discard
                    # this one.
                    ids_to_delete.append(id)

            next_created = created

        verb = "Would have deleted" if self.dry_run else "Deleting"
        print "{verb} {to_delete} rows of {total} for student_module_id {id}".format(
            verb=verb,
            to_delete=len(ids_to_delete),
            total=len(history),
            id=student_module_id,
        )

        if not self.dry_run:
            cursor.execute("""
                delete from courseware_studentmodulehistory
                where id in ({ids})
                """.format(ids=",".join(str(i) for i in ids_to_delete))
            )
