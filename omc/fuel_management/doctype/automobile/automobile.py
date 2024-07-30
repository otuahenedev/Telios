# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class Automobile(Document):
	def validate(self):
		#if not self.petrol_rate or self.diesel_rate :
		#	frappe.throw("Please check thr fuel rates")
		# sum for all petrol pumps
		tank_volume = 0
		for item in self.table_qaot:
			tank_volume += item.volume
		
		#placing it in the right field
		self.volume_l = tank_volume
