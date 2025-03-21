import frappe
from frappe.model.document import Document


class OutletDailyFuelLog(Document):
    def after_submit(self):
        self.update_outlet_fuel_tanks()
        calculate_tank_variance(self, "on_submit")

    def update_outlet_fuel_tanks(self):
        """
        Update the Outlet Fuel Tank's current_level_l and last_reading_date based
        on the readings in the Outlet Daily Fuel Log.
        """
        if not self.readings:
            frappe.throw("The readings table cannot be empty. Please provide readings for the tanks.")

        if not self.datetime:
            frappe.throw("Datetime field is missing in the Outlet Daily Fuel Log.")

        oft_totals = {}

        for reading in self.readings:
            if not reading.oft:
                frappe.throw(f"Outlet Fuel Tank is missing for Tank ID {reading.tank_id}.")
            if reading.current_tank_level is None:
                frappe.throw(f"Current Tank Level is missing for Tank ID {reading.tank_id}.")

            oft_totals.setdefault(reading.oft, 0)
            oft_totals[reading.oft] += reading.current_tank_level

        for oft, total_level in oft_totals.items():
            try:
                oft_doc = frappe.get_doc("Outlet Fuel Tank", oft)
                total_capacity = oft_doc.tank_capacity_l or 1  # Prevent division errors

                if total_level > total_capacity:
                    frappe.throw(f"The total level for Tank {oft_doc.name} exceeds capacity. "
                                 f"Recorded: {total_level}L, Capacity: {total_capacity}L.")

                # Fetch datetime from Outlet Daily Fuel Log
                last_reading_date = self.datetime

                # Debugging Logs
                frappe.logger().info(f"Updating Tank: {oft_doc.name}")
                frappe.logger().info(f"New Level: {total_level}L")
                frappe.logger().info(f"Last Reading Date: {last_reading_date}")

                # Update fields using frappe.db.set_value()
                frappe.db.set_value("Outlet Fuel Tank", oft, "current_level_l", total_level)
                frappe.db.set_value("Outlet Fuel Tank", oft, "current_percent", (total_level / total_capacity) * 100 if total_capacity else 0)
                frappe.db.set_value("Outlet Fuel Tank", oft, "last_reading_date", last_reading_date)

                frappe.logger().info(f"Updated {oft_doc.name} successfully!")

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
        tank = frappe.get_doc("Outlet Fuel Tank", reading.oft)
        expected_level = tank.current_level_l or 0
        variance = reading.current_tank_level - expected_level

        # Debugging
        frappe.logger().info(f"Variance Calculation: Tank {tank.name}, Expected {expected_level}, Recorded {reading.current_tank_level}, Variance {variance}")

        frappe.db.set_value("Outlet Fuel Tank", tank.name, "variance", variance)

        if abs(variance) > (0.05 * tank.tank_capacity_l):  # 5% threshold
            frappe.log_error(
                title="Tank Variance Exceeded",
                message=f"Tank {tank.name} variance exceeded threshold. Variance: {variance}L."
            )