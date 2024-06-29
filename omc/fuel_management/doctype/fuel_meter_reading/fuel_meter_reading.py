# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FuelMeterReading(Document):
	

	def validate(self):
		#if not self.petrol_rate or self.diesel_rate :
		#	frappe.throw("Please check thr fuel rates")
		# sum for all petrol pumps
		petrol_liters_sold = 0
		for item in self.table_mtto:
			petrol_liters_sold += item.total_liters_sold
		
		#placing it in the right field
		self.total_liters_of_petrol_sold = petrol_liters_sold

		#total sales for petrol
		self.total_sales_for_petrol = 	self.petrol_rate * petrol_liters_sold
		
		# sum for all diesel pumps
		diesel_liters_sold = 0
		for litter in self.table_yvwr:
			diesel_liters_sold += litter.total_liters_sold

		#placing it in the right field
		self.total_liters_of_diesel_sold = diesel_liters_sold

		##total sales for petrol
		self.total_sales_for_diesel = 	self.diesel_rate * diesel_liters_sold

		
	
		
