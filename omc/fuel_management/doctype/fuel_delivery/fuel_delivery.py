# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FuelDelivery(Document):
	def validate(self):
		if (self.buy_price != 0):
			self.paid_amount = self.buy_price * self.nominal_volume_l
		else:
			self.paid_amount = self.diesel_buy_price * self.nominal_volume_l
