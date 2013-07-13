"""Test the clean_history management command."""

from mock import Mock

import dateutil.parser

from django.test import TestCase
from django.db import connection

from courseware.management.commands.clean_history import StudentModuleHistoryCleaner


def parse_date(sdate):
    """Parse a string date into a datetime."""
    parsed = dateutil.parser.parse(sdate)
    parsed = parsed.replace(tzinfo=dateutil.tz.gettz('UTC'))
    return parsed

class SmhcSayStubbed(StudentModuleHistoryCleaner):
    """StudentModuleHistoryCleaner, but with .say() stubbed for testing."""
    def __init__(self, **kwargs):
        super(SmhcSayStubbed, self).__init__(**kwargs)
        self.said_lines = []

    def say(self, msg):
        self.said_lines.append(msg)


class SmhcDbMocked(SmhcSayStubbed):
    """StudentModuleHistoryCleaner, but with db access mocked."""
    def __init__(self, **kwargs):
        super(SmhcDbMocked, self).__init__(**kwargs)
        self.get_history_for_student_modules = Mock()
        self.delete_history = Mock()

    def set_rows(self, rows):
        """Set the mocked history rows."""
        rows = [(row_id, parse_date(created)) for row_id, created in rows]
        self.get_history_for_student_modules.return_value = rows


class HistoryCleanerTest(TestCase):
    """Base class for all history cleaner tests."""

    def assert_said(self, smhc, *msgs):
        """Fail if the `smhc` didn't say `msgs`."""
        self.assertEqual(smhc.said_lines, list(msgs))


class HistoryCleanerNoDbTest(HistoryCleanerTest):
    """Tests of StudentModuleHistoryCleaner with db access mocked."""

    def test_empty(self):
        smhc = SmhcDbMocked()
        smhc.set_rows([])

        smhc.clean_one_student_module(1)
        self.assert_said(smhc, "No history for student_module_id 1")

        # Nothing to delete, so delete_history wasn't called.
        smhc.delete_history.assert_has_calls([])

    def test_one_row(self):
        smhc = SmhcDbMocked()
        smhc.set_rows([
            (1, "2013-07-13 12:11:10.987"),
        ])
        smhc.clean_one_student_module(1)
        self.assert_said(smhc, "Deleting 0 rows of 1 for student_module_id 1")
        # Nothing to delete, so delete_history wasn't called.
        smhc.delete_history.assert_has_calls([])

    def test_one_row_dry_run(self):
        smhc = SmhcDbMocked(dry_run=True)
        smhc.set_rows([
            (1, "2013-07-13 12:11:10.987"),
        ])
        smhc.clean_one_student_module(1)
        self.assert_said(smhc, "Would have deleted 0 rows of 1 for student_module_id 1")
        # Nothing to delete, so delete_history wasn't called.
        smhc.delete_history.assert_has_calls([])

    def test_two_rows_close(self):
        smhc = SmhcDbMocked()
        smhc.set_rows([
            (7, "2013-07-13 12:34:56.789"),
            (9, "2013-07-13 12:34:56.987"),
        ])
        smhc.clean_one_student_module(1)
        self.assert_said(smhc, "Deleting 1 rows of 2 for student_module_id 1")
        smhc.delete_history.assert_called_once_with([7])

    def test_two_rows_far(self):
        smhc = SmhcDbMocked()
        smhc.set_rows([
            (7, "2013-07-13 12:34:56.789"),
            (9, "2013-07-13 12:34:57.890"),
        ])
        smhc.clean_one_student_module(1)
        self.assert_said(smhc, "Deleting 0 rows of 2 for student_module_id 1")
        smhc.delete_history.assert_has_calls([])

    def test_a_bunch_of_rows(self):
        smhc = SmhcDbMocked()
        smhc.set_rows([
            ( 4, "2013-07-13 16:30:00.000"),    # keep
            ( 8, "2013-07-13 16:30:01.100"),
            (15, "2013-07-13 16:30:01.200"),
            (16, "2013-07-13 16:30:01.300"),    # keep
            (23, "2013-07-13 16:30:02.400"),
            (42, "2013-07-13 16:30:02.500"),
            (98, "2013-07-13 16:30:02.600"),    # keep
            (99, "2013-07-13 16:30:59.000"),    # keep
        ])
        smhc.clean_one_student_module(17)
        self.assert_said(smhc, "Deleting 4 rows of 8 for student_module_id 17")
        smhc.delete_history.assert_called_once_with([42, 23, 15, 8])


class HistoryCleanerWitDbTest(HistoryCleanerTest):
    """Tests of StudentModuleHistoryCleaner with a real db."""

    def parse_rows(self, rows):
        """Parse convenient rows into real data."""
        rows = [
            (row_id, parse_date(created), student_module_id)
            for row_id, created, student_module_id in rows
        ]
        return rows

    def write_history(self, rows):
        """Write history rows to the db.

        Each row should be (id, created, student_module_id).

        """
        cursor = connection.cursor()
        cursor.executemany("""
            INSERT INTO courseware_studentmodulehistory
            (id, created, student_module_id)
            VALUES (%s, %s, %s)
            """,
            self.parse_rows(rows),
        )

    def read_history(self):
        """Read the history from the db, and return it as a list of tuples.

        Returns [(id, created, student_module_id), ...]

        """
        cursor = connection.cursor()
        cursor.execute("""
            SELECT id, created, student_module_id FROM courseware_studentmodulehistory
        """)
        return cursor.fetchall()

    def assert_history(self, rows):
        """Assert that the history rows are the same as `rows`."""
        self.assertEqual(self.parse_rows(rows), self.read_history())

    def test_no_history(self):
        # Cleaning a student_module_id with no history leaves the db unchanged.
        smhc = SmhcSayStubbed()
        self.write_history([
            ( 4, "2013-07-13 16:30:00.000", 11),    # keep
            ( 8, "2013-07-13 16:30:01.100", 11),
            (15, "2013-07-13 16:30:01.200", 11),
            (16, "2013-07-13 16:30:01.300", 11),    # keep
            (23, "2013-07-13 16:30:02.400", 11),
            (42, "2013-07-13 16:30:02.500", 11),
            (98, "2013-07-13 16:30:02.600", 11),    # keep
            (99, "2013-07-13 16:30:59.000", 11),    # keep
        ])

        smhc.clean_one_student_module(22)
        self.assert_said(smhc, "No history for student_module_id 22")
        self.assert_history([
            ( 4, "2013-07-13 16:30:00.000", 11),    # keep
            ( 8, "2013-07-13 16:30:01.100", 11),
            (15, "2013-07-13 16:30:01.200", 11),
            (16, "2013-07-13 16:30:01.300", 11),    # keep
            (23, "2013-07-13 16:30:02.400", 11),
            (42, "2013-07-13 16:30:02.500", 11),
            (98, "2013-07-13 16:30:02.600", 11),    # keep
            (99, "2013-07-13 16:30:59.000", 11),    # keep
        ])

    def test_a_bunch_of_rows(self):
        # Cleaning a student_module_id with 8 records, 4 to delete.
        smhc = SmhcSayStubbed()
        self.write_history([
            ( 4, "2013-07-13 16:30:00.000", 11),    # keep
            ( 8, "2013-07-13 16:30:01.100", 11),
            (15, "2013-07-13 16:30:01.200", 11),
            (16, "2013-07-13 16:30:01.300", 11),    # keep
            (17, "2013-07-13 16:30:01.310", 22),    # other student_module_id!
            (23, "2013-07-13 16:30:02.400", 11),
            (42, "2013-07-13 16:30:02.500", 11),
            (98, "2013-07-13 16:30:02.600", 11),    # keep
            (99, "2013-07-13 16:30:59.000", 11),    # keep
        ])

        smhc.clean_one_student_module(11)
        self.assert_said(smhc, "Deleting 4 rows of 8 for student_module_id 11")
        self.assert_history([
            ( 4, "2013-07-13 16:30:00.000", 11),    # keep
            (16, "2013-07-13 16:30:01.300", 11),    # keep
            (17, "2013-07-13 16:30:01.310", 22),    # other student_module_id!
            (98, "2013-07-13 16:30:02.600", 11),    # keep
            (99, "2013-07-13 16:30:59.000", 11),    # keep
        ])

    def test_a_bunch_of_rows_dry_run(self):
        # Cleaning a student_module_id with 8 records, 4 to delete, 
        # but don't really do it.
        smhc = SmhcSayStubbed(dry_run=True)
        self.write_history([
            ( 4, "2013-07-13 16:30:00.000", 11),    # keep
            ( 8, "2013-07-13 16:30:01.100", 11),
            (15, "2013-07-13 16:30:01.200", 11),
            (16, "2013-07-13 16:30:01.300", 11),    # keep
            (23, "2013-07-13 16:30:02.400", 11),
            (42, "2013-07-13 16:30:02.500", 11),
            (98, "2013-07-13 16:30:02.600", 11),    # keep
            (99, "2013-07-13 16:30:59.000", 11),    # keep
        ])

        smhc.clean_one_student_module(11)
        self.assert_said(smhc, "Would have deleted 4 rows of 8 for student_module_id 11")
        self.assert_history([
            ( 4, "2013-07-13 16:30:00.000", 11),    # keep
            ( 8, "2013-07-13 16:30:01.100", 11),
            (15, "2013-07-13 16:30:01.200", 11),
            (16, "2013-07-13 16:30:01.300", 11),    # keep
            (23, "2013-07-13 16:30:02.400", 11),
            (42, "2013-07-13 16:30:02.500", 11),
            (98, "2013-07-13 16:30:02.600", 11),    # keep
            (99, "2013-07-13 16:30:59.000", 11),    # keep
        ])

    def test_a_bunch_of_rows_weird_order(self):
        # Cleaning a student_module_id with 8 records, 4 to delete.
        smhc = SmhcSayStubbed()
        self.write_history([
            (23, "2013-07-13 16:30:01.100", 11),
            (24, "2013-07-13 16:30:01.300", 11),    # keep
            (27, "2013-07-13 16:30:02.500", 11),
            (30, "2013-07-13 16:30:01.350", 22),    # other student_module_id!
            (32, "2013-07-13 16:30:59.000", 11),    # keep
            (50, "2013-07-13 16:30:02.400", 11),
            (51, "2013-07-13 16:30:02.600", 11),    # keep
            (56, "2013-07-13 16:30:00.000", 11),    # keep
            (57, "2013-07-13 16:30:01.200", 11),
        ])

        smhc.clean_one_student_module(11)
        self.assert_said(smhc, "Deleting 4 rows of 8 for student_module_id 11")
        self.assert_history([
            (24, "2013-07-13 16:30:01.300", 11),    # keep
            (30, "2013-07-13 16:30:01.350", 22),    # other student_module_id!
            (32, "2013-07-13 16:30:59.000", 11),    # keep
            (51, "2013-07-13 16:30:02.600", 11),    # keep
            (56, "2013-07-13 16:30:00.000", 11),    # keep
        ])
