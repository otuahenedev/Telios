// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Outlet Daily Fuel Log", {
// 	refresh(frm) {

// 	},
// });
frappe.ui.form.on('Outlet Daily Fuel Log', {
    outlet: function(frm) {
        if (!frm.doc.outlet) {
            frappe.msgprint(__('Please select an Outlet.'));
            return;
        }

        // Clear the readings child table before fetching new data
        frm.clear_table('readings');

        // Fetch tanks data from the selected outlet
        frappe.call({
            method: 'frappe.client.get',
            args: { doctype: "Outlet", name: frm.doc.outlet },
            callback: function(response) {
                let outlet = response.message;

                if (outlet && outlet.tanks) {
                    outlet.tanks.forEach(tank => {
                        let child = frm.add_child('readings'); // Add row to the readings child table
                        child.tank_id = tank.tank_id; // Populate tank_id
                        child.oft = tank.oft; // Populate oft
                        child.product = tank.product; // Populate product
                       
                    });

                    frm.refresh_field('readings'); // Refresh the child table to reflect changes
                } else {
                    frappe.msgprint(__('No tanks found for the selected Outlet.'));
                }
            }
        });
    }
});