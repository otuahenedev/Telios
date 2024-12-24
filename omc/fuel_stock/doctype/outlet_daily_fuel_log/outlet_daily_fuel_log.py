# Copyright (c) 2024, Kelvin and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class OutletDailyFuelLog(Document):
    def on_submit(self):
        # Call the update logic during validation
        self.update_outlet_fuel_tanks()
		calculate_tank_variance(self, "on_submit")

    def update_outlet_fuel_tanks(self):
        """
        Update the Outlet Fuel Tank's current_level and last_reading_datetime fields
        based on the readings in the Outlet Daily Fuel Log.
        """
        if not self.readings:
            frappe.throw("The readings table cannot be empty. Please provide readings for the tanks.")

        # Dictionary to store the total current tank levels per OFT
        oft_totals = {}

        # Validate and process the readings child table
        for reading in self.readings:
            # Validation: Ensure mandatory fields are filled
            if not reading.oft:
                frappe.throw(f"Outlet Fuel Tank field is missing for Tank ID {reading.tank_id}.")
            if reading.current_tank_level is None:
                frappe.throw(f"Current Tank Level is missing for Tank ID {reading.tank_id}.")
            
            # Aggregate total tank levels per OFT
            if reading.oft not in oft_totals:
                oft_totals[reading.oft] = 0
            oft_totals[reading.oft] += reading.current_tank_level

        # Update the Outlet Fuel Tank Doctype
        for oft, total_level in oft_totals.items():
            try:
                # Fetch the Outlet Fuel Tank document
                oft_doc = frappe.get_doc("Outlet Fuel Tank", oft)

				# Validation: Check if the aggregated total exceeds the tank capacity
				if total_level > oft_doc.tank_capacity_l:
					frappe.throw(f"The total tank level for Tank ID {oft_doc.name} exceeds its capacity. "
					 f"Current Total: {total_level}L, Capacity: {oft_doc.capacity}L." )

                # Update fields in the Outlet Fuel Tank
                oft_doc.current_level_l = total_level
                oft_doc.last_reading_date = self.datetime

                # Save the updated Outlet Fuel Tank document
                oft_doc.save()

            except frappe.DoesNotExistError:
                frappe.log_error(f"Outlet Fuel Tank {oft} does not exist.", "OFT Update Error")
            except Exception as e:
                frappe.log_error(f"Error updating Outlet Fuel Tank {oft}: {str(e)}", "OFT Update Error")

        frappe.msgprint("Outlet Fuel Tank levels updated successfully.")


def calculate_tank_variance(doc, method):
    """
    Calculate variance for tanks and log discrepancies.
    """
    for reading in doc.readings:
        # Fetch the expected level from Outlet Fuel Tank
        tank = frappe.get_doc("Outlet Fuel Tank", reading.oft)
        expected_level = tank.current_level or 0
        variance = reading.current_tank_level - expected_level

        # Update the variance field in the Outlet Fuel Tank
        tank.variance = variance
        tank.save()

        # Log discrepancies if variance exceeds a threshold
        if abs(variance) > (0.05 * tank.capacity):  # Example: 5% threshold
            frappe.log_error(
                title="Tank Variance Exceeded",
                message=f"Tank {tank.name} variance exceeds threshold. Variance: {variance} liters."
            )