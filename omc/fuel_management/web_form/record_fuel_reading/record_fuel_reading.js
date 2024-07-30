frappe.ready(function() {
	// bind events here
	frappe.ui.form.on("Petrol Readings Detail", {
		closing_reading: function(frm,cdt,cdn) {
			var d = locals[cdt][cdn];
			if (d.closing_reading >= d.opening_reading){
				frappe.model.set_value(cdt, cdn, 'total_liters_sold', (d.closing_reading - d.opening_reading));
				
			}
			else{
				msgprint('Closing reading must be more than Opening reading');
				validated = false;
			}
		   // frm.refresh_field('child_table_name');
		}
	});
	
	
	frappe.ui.form.on("Diesel Readings Detail", {
		closing_reading: function(frm,cdt,cdn) {
			var d = locals[cdt][cdn];
			if (d.closing_reading >= d.opening_reading){
				frappe.model.set_value(cdt, cdn, 'total_liters_sold', (d.closing_reading - d.opening_reading));
			}
			else{
				msgprint('Closing reading must be more than Opening reading');
				validated = false;
			}
		   // frm.refresh_field('child_table_name');
		}
	});
})