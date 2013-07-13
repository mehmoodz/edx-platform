"""Test the clean_history management command."""

from mock import Mock, call

import dateutil.parser

from django.test import TestCase
from django.db import connection

from courseware.management.commands.clean_history import StudentModuleHistoryCleaner


class SmhcSayStubbed(StudentModuleHistoryCleaner):
    def __init__(self, **kwargs):
        super(SmhcSayStubbed, self).__init__(**kwargs)
        self.said_lines = []

    def say(self, msg):
        self.said_lines.append(msg)

    def assert_said(self, *msgs):
       assert self.said_lines == list(msgs)


class SmhcDbMocked(SmhcSayStubbed):
    def __init__(self, **kwargs):
        super(SmhcDbMocked, self).__init__(**kwargs)
        self.get_history_for_student_modules = Mock()
        self.delete_history = Mock()

    def set_rows(self, rows):
        rows = [(id, dateutil.parser.parse(created)) for id, created in rows]
        self.get_history_for_student_modules.return_value = rows


class HistoryCleanerNoDbTest(TestCase):

    def test_empty(self):
        smhc = SmhcDbMocked()
        smhc.set_rows([])

        smhc.clean_one_student_module(1)
        smhc.assert_said("No history for student_module_id 1")

        # Nothing to delete, so delete_history wasn't called.
        smhc.delete_history.assert_has_calls([])

    def test_one_row(self):
        smhc = SmhcDbMocked()
        smhc.set_rows([
            (1, "2013-07-13 12:11:10.987"),
        ])
        smhc.clean_one_student_module(1)
        smhc.assert_said("Deleting 0 rows of 1 for student_module_id 1")
        # Nothing to delete, so delete_history wasn't called.
        smhc.delete_history.assert_has_calls([])

    def test_one_row_dry_run(self):
        smhc = SmhcDbMocked(dry_run=True)
        smhc.set_rows([
            (1, "2013-07-13 12:11:10.987"),
        ])
        smhc.clean_one_student_module(1)
        smhc.assert_said("Would have deleted 0 rows of 1 for student_module_id 1")
        # Nothing to delete, so delete_history wasn't called.
        smhc.delete_history.assert_has_calls([])

    def test_two_rows_close(self):
        smhc = SmhcDbMocked()
        smhc.set_rows([
            (7, "2013-07-13 12:34:56.789"),
            (9, "2013-07-13 12:34:56.987"),
        ])
        smhc.clean_one_student_module(1)
        smhc.assert_said("Deleting 1 rows of 2 for student_module_id 1")
        smhc.delete_history.assert_called_once_with([7])

    def test_two_rows_far(self):
        smhc = SmhcDbMocked()
        smhc.set_rows([
            (7, "2013-07-13 12:34:56.789"),
            (9, "2013-07-13 12:34:57.890"),
        ])
        smhc.clean_one_student_module(1)
        smhc.assert_said("Deleting 0 rows of 2 for student_module_id 1")
        smhc.delete_history.assert_has_calls([])
