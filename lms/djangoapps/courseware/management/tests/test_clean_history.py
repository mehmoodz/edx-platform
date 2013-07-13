"""Test the clean_history management command."""

from django.test import TestCase
from django.db import connection

from courseware.management.commands.clean_history import StudentModuleHistoryCleaner


class HistoryCleanerTest(TestCase):
    def test_it(self):
        self.assertEqual(3, 3)
