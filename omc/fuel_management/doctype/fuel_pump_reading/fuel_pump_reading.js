// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt


frappe.ui.form.on('Fuel Pump Reading', {
    outlet: function(frm){
        let dispense = frm.doc.outlet
        if (dispense){
            frappe.call({
                method:"omc.fuel_management.doctype.fuel_pump_reading.fuel_pump_reading.attendetails",
                args:{dispense:dispense}
            }).done((r) => {
                console.log(r)
                frm.fields_dict.table_mtto.grid.update_docfield_property("fuel_pump","options", r)
                frm.fields_dict.table_yvwr.grid.update_docfield_property("fuel_pump","options", r.message)
                

                
            })
        }

    }
	// refresh(frm) {
	//	if(frm.doc.status=="Closing Reading")
      //      cur_frm.set_df_property("child_table_field_name","options",["A","B","C","D"],current_form_name"field_name_of_chils_table","name_of_child_table_row");
	//}
})




// Syntax
const currentDate = new Date();
const timestamp = currentDate.getTime();

frappe.ui.form.on("Petrol Readings Detail", {
    closing_reading: function(frm,cdt,cdn) {
        var d = locals[cdt][cdn];
        if (d.closing_reading >= d.opening_reading){
            frappe.model.set_value(cdt, cdn, 'total_liters_sold', (d.closing_reading - d.opening_reading));

        }
        else{

        }
       // frm.refresh_field('child_table_name');
    }
});


frappe.ui.form.on("Diesel Readings Detail", {
    closing_reading: function(frm,cdt,cdn) {
        var d = locals[cdt][cdn];
        frappe.model.set_value(cdt, cdn, 'total_liters_sold', (d.closing_reading - d.opening_reading));
       // frm.refresh_field('child_table_name');
    }
});







 