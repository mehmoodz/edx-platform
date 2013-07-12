"""A command to clean the StudentModuleHistory table.

When we added XBlock storage, each field modification wrote a new history row
to the db.  Now that we have bulk saves to avoid that database hammering, we
need to clean out the unnecessary rows from the database.

This is the command that does that.

"""

from django.core.management.base import BaseCommand
from optparse import make_option

class Command(BaseCommand):
    """The actual clean_history command to clean history rows."""

    help = "Deletes unneeded rows from the StudentModuleHistory table."

    option_list = BaseCommand.option_list + (
        make_option(
            '--dry-run',
            action='store_true',
            default=False,
            help="Don't change the database, just show what would be done.",
        ),
    )

    def __init__(self, *args, **kwargs):
        super(Command, self).__init__(*args, **kwargs)
        self.dry_run = False
        self.verbosity = 1

    def handle(self, *args, **options):
        print options
        self.dry_run = options["dry_run"]
        self.verbosity = int(options["verbosity"])

    def clean_one_student_module(self, student_module_id):
        """Clean one StudentModule's-worth of history.

        `student_module_id`: the id of the StudentModule to process.

        """
        pass
