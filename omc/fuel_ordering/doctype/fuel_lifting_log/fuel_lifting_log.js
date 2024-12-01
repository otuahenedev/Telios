// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

 frappe.ui.form.on("Fuel Lifting Log", {
    fuel_lifting_request_ref(frm) {
        fetch_fuel_delivered_to_details(frm, frm.doc.fuel_lifting_request_ref);
       
		

	}
// 	refresh(frm) {

// 	},
 });

function fetch_fuel_delivered_to_details(frm, ref) {
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Fuel Lifting Request",
            name: ref,
        },
        callback: function(response) {
            let log = response.message;
            if (log && log.table_mxlk) {
                log.table_mxlk.forEach(out => {
                    let child_row = frm.add_child("delivered_to");
                        child_row.fuel_station = out.fuel_station;
                        child_row.outlet_code = out.outlet_code;
                        child_row.volume_l = out.volume_l;
                    
                });
                frm.refresh_field("delivered_to");
            }
        }
    });
}