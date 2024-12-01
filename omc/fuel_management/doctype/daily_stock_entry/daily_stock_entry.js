// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

 frappe.ui.form.on("Daily Stock Entry", {
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
                
                // Clear and populate 'tank_reading' table
                if (customer && customer.custom_outlet_tank) {
                    frm.clear_table("tank_reading");
                    customer.custom_outlet_tank.forEach(product => {
                        let child = frm.add_child("tank_reading");
                        child.product = product.product;
                        child.rate = product.tank;
                    });
                    frm.refresh_field("tank_reading");
                    
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
 });
