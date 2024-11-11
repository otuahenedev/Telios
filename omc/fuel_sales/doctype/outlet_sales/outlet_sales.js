// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Outlet Sales", {
// 	refresh(frm) {

// 	},
// });
// Main trigger for 'outlet' field - Step 1: Fetch product pricing and populate it
frappe.ui.form.on("Outlet Sales", {
    outlet: function(frm) {
        let outlet = frm.doc.outlet;
        frm.clear_table("dispenser_readings");
        
        if (!outlet) {
            frappe.msgprint(__('Please select an Outlet.'));
            return;
        }
        
        // Fetch product pricing data from Customer doctype
        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Customer",
                name: outlet,
            },
            callback: function(response) {
                let customer = response.message;
                
                // Clear and populate 'product_pricing' table
                if (customer && customer.custom_product_rates) {
                    frm.clear_table("product_pricing");
                    customer.custom_product_rates.forEach(product => {
                        let child = frm.add_child("product_pricing");
                        child.product = product.product;
                        child.rate = product.rate;
                    });
                    frm.refresh_field("product_pricing");
                    
                } else {
                    frappe.msgprint(__('No products found for the selected Outlet.'));
                }
                
                // Proceed to Step 2: Check if last reading exists and fetch or initialize pump details
                handle_last_fuel_dispenser_reading(frm, outlet);
            },
            error: function() {
                frappe.msgprint(__('Failed to fetch Outlet data.'));
            }
        });
    },
    
    validate: function(frm) {
        // Step 3: Validate readings, calculate differences, and populate totals
        frm.clear_table('product_totals');  // Clear previous totals
        let product_totals = {};
        let validation_error = false;

        frm.doc.dispenser_readings.forEach(row => {
            // Validation: Ensure Current reading >= Last reading
            if (row.current_reading < row.last_reading) {
                frappe.msgprint({
                    title: __('Validation Error'),
                    message: __('Current Reading must be greater than or equal to Last Reading for pump {0} ({1})', [row.pump, row.product]),
                    indicator: 'red'
                });
                validation_error = true;
                return;
            }

            // Calculate difference and store it
            row.difference = (row.current_reading || 0) - (row.last_reading || 0);

            // Accumulate total volume sold by product
            if (!product_totals[row.product]) {
                product_totals[row.product] = 0;
            }
            product_totals[row.product] += row.difference;
        });

        if (validation_error) {
            frappe.validated = false;
            return;
        }

        // Step 4: Populate Product Totals child table and calculate sales
        for (let product in product_totals) {
            let total_volume_sold = product_totals[product];

            // Find the rate for this product in product_pricing
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
                total_volume_sold_l: total_volume_sold,
                total_sales_ghs: total_volume_sold * rate
            });
        }

        frm.refresh_field('product_totals');

        // Step 5: Sum up total_sales_ghs in Product Totals and set total_sales in parent
        let total_sales = frm.doc.product_totals.reduce((sum, row) => sum + (row.total_sales_ghs || 0), 0);
        frm.set_value('total_sales', total_sales);
        
    }
});

// Step 2: Check for last reading and fetch or initialize pump details
function handle_last_fuel_dispenser_reading(frm, outlet) {
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Outlet Sales",
            filters: { outlet: outlet },
            fields: ["name", "creation"],
            order_by: "creation desc",
            limit: 1
        },
        callback: function(response) {
            if (response.message && response.message.length > 0) {
                fetch_last_fuel_dispenser_reading(frm, outlet);
                fetch_attendant_details(frm, outlet)
                frm.set_df_property('dispenser_readings', 'cannot_add_rows', true);
                frm.set_df_property('dispenser_readings', 'cannot_delete_rows', true);           

                
            } else {
                fetch_active_pumps(frm, outlet);
                console.log(`No previous Outlet Sales found for outlet: ${outlet}. Fetching active pump details.`);
                fetch_attendant_details(frm, outlet)
                // rows cannot be added or deleted
                frm.set_df_property('dispenser_readings','cannot_add_rows', true);  
                frm.set_df_property('dispenser_readings', 'cannot_delete_rows', true);           }
        }
    });
}

// Fetch last reading and populate 'dispenser_readings' table with relevant data
function fetch_last_fuel_dispenser_reading(frm, outlet) {
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Outlet Sales",
            filters: { outlet: outlet },
            order_by: "creation desc",
            limit_page_length: 1
        },
        callback: function(response) {
            populate_child_tables_from_last_reading(frm, response.message);
            
        }
    });
}

// Populate 'dispenser_readings' from last reading or initialize with active pumps
function populate_child_tables_from_last_reading(frm, last_reading) {
    frm.clear_table("dispenser_readings");

    if (last_reading && last_reading.dispenser_readings) {
        last_reading.dispenser_readings.forEach(row => {
            let child_row = frm.add_child("dispenser_readings");
            child_row.pump = row.pump;
            child_row.last_reading = row.current_reading;
            child_row.previous_capture_reading = row.capture_reading;
            child_row.previous_shifts_attendant = row.attendant;
        });
    } else {
        fetch_active_pumps(frm, frm.doc.outlet);
        
    }

    frm.refresh_field("dispenser_readings");
}

// Fetch active pumps from custom_fuel_dispensers if no last reading is available
function fetch_active_pumps(frm, outlet) {
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Customer",
            name: outlet,
        },
        callback: function(response) {
            let customer = response.message;
            if (customer && customer.custom_fuel_dispensers) {
                customer.custom_fuel_dispensers.forEach(pump => {
                    if (pump.status === "Active") {
                        let child_row = frm.add_child("dispenser_readings");
                        child_row.pump = pump.dispenser;
                        child_row.last_reading = 0;  // Initialize last reading as 0
                    }
                });
                frm.refresh_field("dispenser_readings");
            }
        }
    });
}

// Calculate difference on change in 'current_reading' field in dispenser_readings
frappe.ui.form.on("dispenser_readings", "current_reading", function(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    row.difference = (row.current_reading || 0) - (row.last_reading || 0);
    frm.refresh_field("dispenser_readings");
});

// Handle RTT
// RTT deduction logic in the 'validate' function
frappe.ui.form.on("Outlet Sales", {
    validate: function(frm) {
        // Existing logic for calculating product totals and sales
        frm.clear_table('product_totals');
        let product_totals = {};
        let validation_error = false;

        frm.doc.dispenser_readings.forEach(row => {
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

            if (!product_totals[row.product]) {
                product_totals[row.product] = 0;
            }
            product_totals[row.product] += row.difference;
        });

        if (validation_error) {
            frappe.validated = false;
            return;
        }

        // Deduct RTT Liters from each product's total volume sold
        frm.doc.returned_to_tank_test.forEach(rtt_row => {
            if (product_totals[rtt_row.product]) {
                product_totals[rtt_row.product] -= rtt_row.liters_used || 0;
            }
        });

        // Populate Product Totals and calculate final sales after RTT deductions
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
                total_volume_sold_l: total_volume_sold,
                total_sales_ghs: total_volume_sold * rate
            });
        }

        frm.refresh_field('product_totals');
        let total_sales = frm.doc.product_totals.reduce((sum, row) => sum + (row.total_sales_ghs || 0), 0);
        frm.set_value('total_sales', total_sales);
    }
});

// HANDLE CREDIT SALES
// Step 2: Adding credit sales deduction logic in the 'validate' function
frappe.ui.form.on("Outlet Sales", {
    validate: function(frm) {
        // Original total sales calculation logic here

        // Sum up credit sales for each product
        let credit_sales_totals = {};
        frm.doc.credit_sales.forEach(credit_row => {
            if (!credit_sales_totals[credit_row.product]) {
                credit_sales_totals[credit_row.product] = 0;
            }
            credit_sales_totals[credit_row.product] += credit_row.total_sales || 0;
        });

        // Adjust total sales by subtracting credit sales from the grand total
        let total_sales = frm.doc.product_totals.reduce((sum, row) => sum + (row.total_sales_ghs || 0), 0);
        let total_credit_sales = Object.values(credit_sales_totals).reduce((sum, value) => sum + value, 0);

        // Set the net cash deposit sales by excluding credit sales
        frm.set_value('total_sales', total_sales);
        frm.set_value('net_cash_sales', total_sales - total_credit_sales);
    }
});

//helper function to Fetch attendant details and update attendant field in the child tables
function fetch_attendant_details(frm, outlet){
    // Fetch attendant details and update attendant field in the child tables
    //        method: "omc.fuel_management.doctype.fuel_dispenser_reading.fuel_dispenser_reading.pumpdetails",

    frappe.call({
       // method: "omc.fuel_sales.doctype.outlet_sales.outlet_sales.pumpdetails",
       method: "omc.fuel_management.doctype.fuel_dispenser_reading.fuel_dispenser_reading.pumpdetails",
        args: { atted:outlet },  // Pass 'atted' argument for attendant details
        callback: function(response) {
            if (!response || response.exc) {
                console.error("Error fetching attendant details", response);
                return;
            }
            console.log("Attendant details fetched successfully:", response.message);
            update_attendant_select_options(frm, response.message); 
            update_pump_select_options(frm, response.message); // Dynamically set attendant field options
        }
    });
}

// Helper function to dynamically update the attendant field options in child tables
function update_attendant_select_options(frm, attendant_data) {
    if (!attendant_data) {
        console.warn("No valid attendant data received.");
        return;
    }

    let attendants = Array.isArray(attendant_data.message) ? attendant_data.message : Object.values(attendant_data.message);

    // Update 'attendant' field options dynamically for both child tables
    frm.fields_dict.dispenser_readings.grid.update_docfield_property('attendant', "options", attendants);
   
    // Refresh fields to apply updated attendant options
   frm.refresh_field("dispenser_readings");
   
}
/*
// Helper function to dynamically update the pump  field options in child tables
function update_pump_select_options(frm, pump_data) {
    if (!pump_data) {
        console.warn("No valid attendant data received.");
        return;
    }

    let pumps = Array.isArray(pump_data_data.message) ? pump_data.message : Object.values(pump_data.message);

    // Update 'attendant' field options dynamically for both child tables
    frm.fields_dict.dispenser_readings.grid.update_docfield_property('pump', "options", pumps);
   
    // Refresh fields to apply updated attendant options
   frm.refresh_field("dispenser_readings");
   
}*/