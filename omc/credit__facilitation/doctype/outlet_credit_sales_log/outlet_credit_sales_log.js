// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Outlet Credit Sales Log", {
// 	refresh(frm) {

// 	},
// });
frappe.ui.form.on("Outlet Credit Sales Log", {
    // fetch pricing from linked outlet
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
                
              
            },
            error: function() {
                frappe.msgprint(__('Failed to fetch Outlet data.'));
            }
        });
    },
    // fetch staff from company approved to have credit
    company: function(frm){
        const company = frm.doc.company;
        frappe.call({
            method: "omc.credit__facilitation.doctype.outlet_credit_sales_log.outlet_credit_sales_log.staffdetails",
            args: { staff: company },  // Pass 'staff' argument for staff details
            callback: function(response) {
                if (!response || response.exc) {
                    console.error("Error fetching staff details", response);
                    return;
                }
                console.log("staff details fetched successfully:", response.message);
                update_staff_select_options(frm, response.message);  // Dynamically set staff field options
            }
        })
    }
    //unfinsed code to create sales button
    /*
    refresh: function(frm){
        if (frm.doc.docstatus == 1){
            frm.add_custom_button(__('Sales Invoice' ),() => {
                frappe.new.doc("Sales Invoice",{}, inv => {})
            },__('Create'));
        }
    }
})
    */
})

// Helper function to dynamically update the staff field options in child tables
function update_staff_select_options(frm, staff_data) {
    if (!staff_data) {
        console.warn("No valid staff data received.");
        return;
    }

    let staffing = Array.isArray(staff_data.message) ? staff_data.message : Object.values(staff_data.message);

    // Update 'staff' field options dynamically for both child tables
    frm.set_df_property("name1", "options", staffing.join("\n"));
   
    // Refresh fields to apply updated staff options
   frm.refresh_field("name1");
   
}