// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Fuel Lifting Order", {
// 	refresh(frm) {

// 	},
// });



frappe.ui.form.on("Request Fuel Details", {
    table_mxlk_add(frm, cdt, cdn){
                       
}
});

frappe.ui.form.on("Fuel Lifting Order", {
    fuel_type: function(frm) {
        let fuel_type = frm.doc.fuel_type;

        // Check if the fuel type is AGO
        if (fuel_type == 'AGO') {
            frappe.call({
                method: "omc.fuel_ordering.doctype.fuel_lifting_order.fuel_lifting_order.justification",
                args: { fuel_type: fuel_type }
            }).done((r) => {
                frm.doc.just = [];
                $.each(r.message, function(_i, e) {
                    let justice = frm.add_child("just");
                    justice.outlet = e.FuelStation;
                    justice.avg_daily_sales = e.AverageDailyDieselSales;
                    justice.current_stock_level = e.CurrentDieselStock;
                    justice.stock_lifespan = e.DieselStockLifespan;
                    justice.reorder_level = e.ReorderLevelDiesel;
                });
                refresh_field("just");

                // Call function to render table for AGO
                render_fuel_data_table(frm, "just", "Diesel Justification Data");
            });
        } else if (fuel_type) {  // If the fuel type is anything else
            frappe.call({
                method: "omc.fuel_ordering.doctype.fuel_lifting_order.fuel_lifting_order.justification",
                args: { fuel_type: fuel_type }
            }).done((r) => {
                frm.doc.justp = [];
                $.each(r.message, function(_i, j) {
                    let justiced = frm.add_child("justp");
                    justiced.outlet = j.FuelStation;
                    justiced.avg_daily_sales = j.AverageDailyPetrolSales;
                    justiced.current_stock_level = j.CurrentPetrolStock;
                    justiced.stock_lifespan = j.PetrolStockLifespan;
                    justiced.reorder_level = j.ReorderLevelPetrol;
                });
                refresh_field("justp");

                // Call function to render table for Petrol
                render_fuel_data_table(frm, "justp", "Petrol Justification Data");
            });
        }
    }
});

// Helper function to render HTML table in the HTML field
function render_fuel_data_table(frm, child_table_name, title) {
    let table_content = `
        <h4>${title}</h4>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Outlet</th>
                    <th>Average Daily Sales</th>
                    <th>Current Stock Level</th>
                    <th>Stock Lifespan</th>
                    <th>Reorder Level</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Loop through each row in the specified child table
    (frm.doc[child_table_name] || []).forEach(row => {
        table_content += `
            <tr>
                <td>${row.outlet || ""}</td>
                <td>${row.avg_daily_sales || ""}</td>
                <td>${row.current_stock_level || ""}</td>
                <td>${row.stock_lifespan || ""}</td>
                <td>${row.reorder_level || ""}</td>
            </tr>
        `;
    });

    table_content += `
            </tbody>
        </table>
    `;

    // Set the HTML content to the HTML field
    frm.set_df_property("fuel_data_table", "options", table_content);
}

frappe.ui.form.on('Fuel Lifting Order', {
    

    /*validate: function(frm){
        total = 0; 
		tank_volume = frm.doc.nominal_volume_l;
		frm.doc.table_mxlk.forEach(function(d) { total += d.volume_l; });
        if (total == tank_volume){
            frappe.validated = true; 
            console.log(total,tank_volume);
         
        }
        else{
            frappe.throw(__('Total Volume Listed for Outlets Must Be Equal to the Total Capacity of the Fuel Truck Selected.  '))
            frappe.validated = false;
        }
    },/*

    */
    brv: function(frm){
        let truckid = frm.doc.brv;
        if(truckid){
            frappe.call({
                method:"omc.fuel_ordering.doctype.fuel_lifting_order.fuel_lifting_order.truckdetails",
                args: {truckid:truckid}
            }).done((r) => {
                console.log(typeof r.message, r.message)
                const mrss = r.message
                console.log(mrss)
                function listAndSumPairs(obj) {
                    let result = [];
                
                    // Extract values from the object and convert them to integers
                    let values = [];
                    for (let key in mrss) {
                        if (mrss.hasOwnProperty(key)) {
                            values.push(parseInt(mrss[key], 10));
                        }
                    }
                
                    // Add original values to the result array
                    result.push(...values);
                
                    // Loop through the array to calculate sums of each pair
                    let length = values.length;
                    for (let i = 0; i < length; i++) {
                        let sum = 0;
                        for (let j = 0; j < length; j++) {
                            sum += values[j];
                            result.push(sum);
                        }
                    }
                
                    // Remove duplicates and sort the result
                    result = [...new Set(result)].sort((a, b) => a - b);
                
                    return result;
                }
                result = listAndSumPairs(r.message)
                $.each(result, function(_i, j){
                    // select options for outlets based on fuel truck on request fuel details
                    frm.fields_dict.table_mxlk.grid.update_docfield_property("volume_l","options", result)

                })
                
                
            })
        }
        else{
            frappe.throw("Select BRV first")
        }
         frm.refresh_field('table_mxlk')

    },
   
    

    

    refresh: function(frm) {

        if ((frm.doc.state === 'Vetted') && (frappe.user.role('Account User'))) {
            // Button to pay Supplier Cost
            frm.add_custom_button(__('Pay Supplier Cost'), function() {
                frappe.call({
                    method: "omc.fuel_ordering.doctype.fuel_lifting_order.fuel_lifting_order.create_supplier_payment_entry",
                    args: { fuel_purchase_order: frm.doc.name },
                    callback: function(r) {
                        if (r.message) {
                            frappe.msgprint("Supplier payment entry created successfully.");
                            frm.reload_doc();
                        }
                    }
                });
            });

            // Button to pay Immediate Taxes
            frm.add_custom_button(__('Pay Immediate Taxes'), function() {
                frappe.call({
                    method: "omc.fuel_ordering.doctype.fuel_lifting_order.fuel_lifting_order.create_immediate_tax_payment_entry",
                    args: { fuel_purchase_order: frm.doc.name },
                    callback: function(r) {
                        if (r.message) {
                            frappe.msgprint("Immediate tax payment entry created successfully.");
                            frm.reload_doc();
                        }
                    }
                });
            });

            // Button to pay Deferred Taxes
            frm.add_custom_button(__('Pay Deferred Taxes'), function() {
                frappe.call({
                    method: "omc.fuel_ordering.doctype.fuel_lifting_order.fuel_lifting_order.create_deferred_tax_payment_entry",
                    args: { fuel_purchase_order: frm.doc.name },
                    callback: function(r) {
                        if (r.message) {
                            frappe.msgprint("Deferred tax payment entry created successfully.");
                            frm.reload_doc();
                        }
                    }
                });
            });
        }
        /*if((frm.doc.docstatus == 1 ) && (frappe.user.has_role('Accounts User'))) {
            frm.add_custom_button("Create Payment Entry ", () => {
               // frappe.msgprint("clicked")
               frappe.new_doc("Payment Entry",{}, fdp => {
                fdp.custom_reference_link = frm.doc.name;
                fdp.payment_type = "Receive"
                fdp.party_type = "Supplier"
                fdp.party = frm.doc.bdc
                fdp.paid_amount = frm.doc.total_cost
                
                
                
               });
            }).css({'background-color':'#f8c516','color':'black','font-weight': 'bold'});;
        }*/
    }
   
});

frappe.ui.form.on('Fuel Lifting Order', {
    before_workflow_action: async (frm) => {
    	let promise = new Promise((resolve, reject) => {
            frappe.dom.unfreeze()
    		frappe.confirm(
    		"<b>Are all fields correctly entered ? Please review the information carefully.</b>",
    		() => resolve(),
    		() => reject() 
    		);
    
    	});
    	await promise.catch(() => frappe.throw());
    }  
});


frappe.ui.form.on('Fuel Lifting Order', {
    refresh: function(frm) {
        // Show buttons only when state is 'Vetted'
        
    }
});