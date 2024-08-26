# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FuelStationPricing(Document):
	def validate(self):
		try:
			if self.workflow_state == "Approved":
				for station in self.pricing_table:
					frappe.db.set_value('Outlet', station.outlet, 'petrol_selling_price', station.petrol_price)
					frappe.db.set_value('Outlet', station.outlet, 'diesel_selling_price', station.diesel_price)
					frappe.db.set_value('Outlet', station.outlet, 'price_change_datetime', station.datetime)
				last_window = frappe.get_last_doc('Fuel Station Pricing')
				frappe.db.set_value('Fuel Station Pricing', last_window, 'status', "Active")

		except Exception as e:
					# Log the error to the Frappe error log document 
					frappe.log_error(f"An error occurred: {str(e)}")			
