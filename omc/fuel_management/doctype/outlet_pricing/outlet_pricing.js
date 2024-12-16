// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

 frappe.ui.form.on("Outlet Pricing", {
    outlet: function(frm) {
        let outlet = frm.doc.outlet;
   
        
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
                let outlet = response.message;
                
                // Clear and populate 'product_pricing' table
                if (outlet && outlet.product_rates) {
                    frm.clear_table("pricing_table");
                    outlet.product_rates.forEach(product => {
                        let child = frm.add_child("pricing_table");
                        child.product = product.product;
                        child.selling_price = product.rate;
                    });
                    frm.refresh_field("pricing_table");
                    
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
    }


// 	refresh(frm) {

// 	},
 });
