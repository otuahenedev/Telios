# Copyright (c) 2024, Kelvin and Contributors
# See license.txt

# import frappe
from frappe.tests import IntegrationTestCase, UnitTestCase


# On IntegrationTestCase, the doctype test records and all
# link-field test record depdendencies are recursively loaded
# Use these module variables to add/remove to/from that list
EXTRA_TEST_RECORD_DEPENDENCIES = []  # eg. ["User"]
IGNORE_TEST_RECORD_DEPENDENCIES = []  # eg. ["User"]


class UnitTestOutlet(UnitTestCase):
	"""
	Unit tests for Outlet.
	Use this class for testing individual functions and methods.
	"""

	pass


class IntegrationTestOutlet(IntegrationTestCase):
	"""
	Integration tests for Outlet.
	Use this class for testing interactions between multiple components.
	"""

	pass
