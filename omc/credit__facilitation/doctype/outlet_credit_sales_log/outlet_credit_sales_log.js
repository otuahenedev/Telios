// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Outlet Credit Sales Log", {
// 	refresh(frm) {

// 	},
// });
frappe.ui.form.on("Outlet Credit Sales Log", {
    refresh: function(frm){
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
})

// Helper function to dynamically update the staff field options in child tables
function update_staff_select_options(frm, staff_data) {
    if (!staff_data) {
        console.warn("No valid staff data received.");
        return;
    }

    let staffing = Array.isArray(staff_data.message) ? staff_data.message : Object.values(staff_data.message);

    // Update 'staff' field options dynamically for both child tables
    frm.fields_dict.dispenser_readings.grid.update_docfield_property('name1', "options", staffing);
   
    // Refresh fields to apply updated staff options
   frm.refresh_field("name1");
   
}