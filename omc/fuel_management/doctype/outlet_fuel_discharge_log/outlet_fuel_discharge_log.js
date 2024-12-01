frappe.ui.form.on('Outlet Fuel Discharge Log', {
	outlet(frm) {
        fetch_active_pumps(frm, frm.doc.outlet);
        fetch_active_tanks(frm, frm.doc.outlet);
		

	}
})


frappe.ui.form.on('Tank Activity', {
    tank_volume_after_delivery: function (frm, cdt, cdn) {
        let row = frappe.get_doc(cdt, cdn);
        if (row.tank_volume_after_delivery && row.tank_volume_before_delivery) {
            row.net_volume_delivered = 
                row.tank_volume_after_delivery - row.tank_volume_before_delivery;
            frm.refresh_field('tank_activity');
        }
        calculate_totals(frm); // Recalculate totals after changes
    }
});

frappe.ui.form.on('Pump Activity', {
    after_discharge: function (frm, cdt, cdn) {
        let row = frappe.get_doc(cdt, cdn);
        if (row.after_discharge && row.before_discharge) {
            row.volume_sold_l = 
                (row.after_discharge - row.before_discharge);
            frm.refresh_field('pump_activity');
        }
        calculate_totals(frm); // Recalculate totals after changes
    }
});

// Function to calculate total_net_vol, Sales During Discharge, and Total Fuel Delivered
function calculate_totals(frm) {
    let total_net_vol = 0;
    let sales_during_discharge = 0;

    // Sum up net_volume_delivered from Tank Activity
    (frm.doc.tank_activity || []).forEach(row => {
        if (row.net_volume_delivered) {
            total_net_vol += row.net_volume_delivered;
        }
    });

    // Sum up volume_sold_l from Pump Activity
    (frm.doc.pump_activity || []).forEach(row => {
        if (row.volume_sold_l) {
            sales_during_discharge += row.volume_sold_l;
        }
    });

    // Set calculated totals in the parent form
    frm.set_value('total_tanks_net_volume_l', total_net_vol);
    frm.set_value('total_sales_during_discharge_l', sales_during_discharge);

    // Calculate Total Fuel Delivered
    frm.set_value('total_fuel_delivered', total_net_vol + sales_during_discharge);

    // Refresh parent form fields to display updated values
    frm.refresh_field('total_tanks_net_volume_l');
    frm.refresh_field('total_sales_during_discharge_l');
    frm.refresh_field('total_fuel_delivered');
}


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
                        let child_row = frm.add_child("pump_activity");
                        child_row.pump = pump.dispenser;
                        child_row.product = pump.product
                    }
                });
                frm.refresh_field("pump_activity");
            }
        }
    });
}

function fetch_active_tanks(frm, outlet) {
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Customer",
            name: outlet,
        },
        callback: function(response) {
            let customer = response.message;
            if (customer && customer.custom_outlet_tank) {
                customer.custom_outlet_tank.forEach(tank => {
                    if (tank.status === "Active") {
                        let child_row = frm.add_child("tank_activity");
                        child_row.tank_warehouse = tank.tank;
                        child_row.product = tank.product
                        child_row.tank = tank.tank_sel


                    }
                });
                frm.refresh_field("tank_activity");
            }
        }
    });
}