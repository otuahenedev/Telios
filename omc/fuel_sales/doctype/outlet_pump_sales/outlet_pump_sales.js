// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Outlet Pump Sales", {
// 	refresh(frm) {

// 	},
// });
// Main trigger for 'outlet' field - Step 1: Fetch product pricing and populate it
frappe.ui.form.on("Outlet Pump Sales", {
    outlet: function(frm) {
        let outlet = frm.doc.outlet;
        frm.clear_table("dispenser_readings");
        frm.clear_table("product_pricing");

        if (!outlet) {
            frappe.msgprint(__('Please select an Outlet.'));
            return;
        }

        // Fetch Outlet details and populate product pricing
        frappe.call({
            method: "frappe.client.get",
            args: { doctype: "Outlet", name: outlet },
            callback: function(response) {
                let outlet = response.message;

                if (outlet) {
                    // Populate product pricing
                    if (outlet.product_rates) {
                        outlet.product_rates.forEach(product => {
                            let child = frm.add_child("product_pricing");
                            child.product = product.product;
                            child.rate = product.rate;
                        });
                        frm.refresh_field("product_pricing");
                    }

                    // Fetch dispenser readings and attendants
                    handle_last_fuel_dispenser_reading(frm, outlet);
                    update_attendant_select_options(frm, outlet.attendants || []);
                } else {
                    frappe.msgprint(__('No data found for the selected Outlet.'));
                }
            }
        });
    },

    validate: function(frm) {
        // Clear totals and validate dispenser readings
        frm.clear_table('product_totals');
        let product_totals = {};
        let validation_error = false;

        frm.doc.dispenser_readings.forEach(row => {
            // Ensure current reading >= last reading
            if (row.current_reading < row.last_reading) {
                frappe.msgprint({
                    title: __('Validation Error'),
                    message: __('Current Reading must be greater than or equal to Last Reading for pump {0} ({1})', [row.pump, row.product]),
                    indicator: 'red'
                });
                validation_error = true;
                return;
            }

            row.difference = (row.current_reading || 0) - (row.last_reading || 0);

            // Accumulate volume sold by product
            if (!product_totals[row.product]) {
                product_totals[row.product] = 0;
            }
            product_totals[row.product] += row.difference;
        });

        if (validation_error) {
            frappe.validated = false;
            return;
        }

        // Adjust product totals for RTT
        frm.doc.returned_to_tank_test.forEach(rtt_row => {
            if (product_totals[rtt_row.product]) {
                product_totals[rtt_row.product] -= rtt_row.liters_used || 0;
            }
        });

        // Populate product totals and calculate sales
        for (let product in product_totals) {
            let total_volume_sold = product_totals[product];
            let product_pricing = frm.doc.product_pricing.find(p => p.product === product);

            if (!product_pricing) {
                frappe.msgprint({
                    title: __('Missing Product Rate'),
                    message: __('No rate found for product {0}. Please update Product Pricing.', [product]),
                    indicator: 'yellow'
                });
                continue;
            }

            let rate = product_pricing.rate || 0;
            frm.add_child('product_totals', {
                product: product,
                total_litres_sold: total_volume_sold,
                total_sales_ghs: total_volume_sold * rate
            });
        }

        frm.refresh_field('product_totals');

        // Calculate total sales and adjust for credit sales
        let total_sales = frm.doc.product_totals.reduce((sum, row) => sum + (row.total_sales_ghs || 0), 0);
        let credit_sales_totals = {};
        frm.doc.credit_sales.forEach(credit_row => {
            if (!credit_sales_totals[credit_row.product]) {
                credit_sales_totals[credit_row.product] = 0;
            }
            credit_sales_totals[credit_row.product] += credit_row.total_sales || 0;
        });

        let total_credit_sales = Object.values(credit_sales_totals).reduce((sum, value) => sum + value, 0);
        frm.set_value('total_sales', total_sales);
        frm.set_value('total_credit_sales', total_credit_sales);
        frm.set_value('net_cash_sales', total_sales - total_credit_sales);
    }
});

// Helper: Handle last dispenser readings or initialize active pumps
function handle_last_fuel_dispenser_reading(frm, outlet) {
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Outlet Pump Sales",
            filters: { outlet: outlet.name },
            fields: ["name", "creation", "dispenser_readings"],
            order_by: "creation desc",
            limit: 1
        },
        callback: function(response) {
            if (response.message && response.message.length > 0) {
                populate_child_tables_from_last_reading(frm, response.message[0]);
            } else {
                fetch_active_pumps(frm, outlet);
            }
        }
    });
}

// Helper: Populate dispenser readings from last entry
function populate_child_tables_from_last_reading(frm, last_entry) {
    frm.clear_table("dispenser_readings");

    if (last_entry.dispenser_readings) {
        last_entry.dispenser_readings.forEach(row => {
            let child_row = frm.add_child("dispenser_readings");
            child_row.pump = row.pump;
            child_row.product = row.product;
            child_row.last_reading = row.current_reading;
            child_row.previous_capture_reading = row.capture_reading;
            child_row.previous_shifts_attendant = row.attendant;
        });
    }

    frm.refresh_field("dispenser_readings");
}

// Helper: Fetch active pumps if no last readings are available
function fetch_active_pumps(frm, outlet) {
    if (outlet.fuel_dispensers) {
        outlet.fuel_dispensers.forEach(pump => {
            if (pump.status === "Active") {
                let child_row = frm.add_child("dispenser_readings");
                child_row.pump = pump.dispenser;
                child_row.product = pump.product;
                child_row.last_reading = 0;  // Initialize to zero
            }
        });
        frm.refresh_field("dispenser_readings");
    } else {
        frappe.msgprint(__('No active pumps found for this Outlet.'));
    }
}

// Helper: Update attendant options dynamically
function update_attendant_select_options(frm, attendants) {
    if (attendants && attendants.length > 0) {
        let options = attendants.map(att => att.name || att);  // Ensure valid data
        frm.fields_dict.dispenser_readings.grid.update_docfield_property('attendant', "options", options);
        frm.refresh_field("dispenser_readings");
    }
}