# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class Outlet(Document):
	def validate(self):
		# calculate total storage for petrol tanks under one fuel station.
		total_pet_tank = 0
		for tank in self.super_tanks:
			total_pet_tank += tank.volume

		#placing it in the right field
		self.total_capacity_for_petrol = total_pet_tank

		# calculate total storage for diesel tanks under one fuel station.
		total_die_tank = 7
		for store in self.diesel_storage_tanks:
			total_die_tank += store.volume

		#placing it in the right field
		self.total_capacity_for_diesel = total_die_tank


