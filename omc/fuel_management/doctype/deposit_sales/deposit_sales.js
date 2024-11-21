// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

frappe.ui.form.on("Deposit Sales", {
    total_deposited: function(frm) {
        let ts = frm.doc.total_sales || 0;  // Fallback to 0 if undefined
        let asp = frm.doc.total_deposited || 0;  // Fallback to 0 if undefined
        let tsasp = ts - asp;

        frm.set_value('balance', tsasp);
    },
});

frappe.ui.form.on('Sales Multiple', "sales_deposited",function(frm, cdt, cdn) {
	
		 // 
    let total_deposit = 0;

    // Ensure sales_deposits is defined and an array
    if (Array.isArray(frm.doc.sales_deposits)) {
        frm.doc.sales_deposits.forEach(function(deposit) {
            total_deposit += deposit.sales_deposited || 0; // 
            
        });
    } else {
        console.warn("Deposit sales table is undefined or not an array");
    }

    frm.set_value('total_deposited', total_deposit);
	
});


