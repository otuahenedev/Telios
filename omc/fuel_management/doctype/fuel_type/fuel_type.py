# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class FuelType(Document):
	def validate(self):
		self.fuel_name = self.fuel_type