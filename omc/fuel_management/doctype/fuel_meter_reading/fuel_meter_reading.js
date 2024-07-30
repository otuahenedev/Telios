// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

 frappe.ui.form.on("Fuel Meter Reading", {
 	refresh(frm) {

 	},
 });
frappe.ui.form.on('Petrol Readings Detail', {
	refresh(frm) {
		// your code here
        set_total(frm); {
            let tot = 0;
            for (let item of frm.doc.table_mtto);{
                tot = item.closing_reading - item.closing_reading;
            }
            frm.set_value("total_liters_sold", tot);
        }
	},
    
});


frappe.ui.form.on('Diesel Readings Detail', {
	refresh(frm) {
		// your code here
	},
    total_liters_sold(frm, cdt, cdn){
        //console.log(cdt, cdn);
       // console.log("changes");
    },
});
