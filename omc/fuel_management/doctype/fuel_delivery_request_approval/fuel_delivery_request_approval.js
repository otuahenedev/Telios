// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Fuel Delivery Request Approval", {
// 	refresh(frm) {

// 	},
// });



frappe.ui.form.on('Fuel Delivery Request Approval', {
    refresh: function(frm) {
        if (frm.doc.docstatus == 1) {
            frm.add_custom_button("Create Fuel Delivery Order", () => {
                frappe.msgprint("clicked")
            });
        }
    }
});
