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
               // frappe.msgprint("clicked")
               frappe.new_doc("Fuel Delivery Process",{}, fdp => {
                fdp.request_approval_form = frm.doc.name;
                
                frm.doc.table_mxlk.forEach( station => {
                    let fdp_item = frappe.model.add_child(fdp, 'fdp_tab');
                    fdp_item.fuel_station = station.fuel_station;
                    fdp_item.outlet_code = station.outlet_code;
                    fdp_item.volume_l = station.volume_l;
                })

               });
            });
        }
    }
});
