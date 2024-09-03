// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

// Add Seletize cdn lib
//$.getScript("https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js",function(){

    //rest code
    
   // });

//fetch volume of trucks into a dropdown for the volume field under request fuel detail child table
/* frappe.ui.form.on("Tanker Compartments", {
    refresh(frm){

    },
    dist(frm, cdt, cdn){
        child = frape.get_doc(cdt, cdn);
        console.log(child)
    }
 },*/


 frappe.ui.form.on("Request Fuel Details", {
    table_mxlk_add(frm, cdt, cdn){
                       
}
});

frappe.ui.form.on('Fuel Order', {
    fuel_type: function(frm){
        let fuel_type = frm.doc.fuel_type
        if(fuel_type == 'Diesel'){
            frappe.call({
                method: "omc.fuel_management.doctype.fuel_order.fuel_order.justification",
                args:{fuel_type:fuel_type}
            }).done((r) => {
                frm.doc.just = []
                $.each(r.message, function(_i, e){
                    let justice = frm.add_child("just")
                    justice.outlet = e.FuelStation;
                    justice.avg_daily_sales = e.AverageDailyDieselSales;
                    justice.current_stock_level = e.CurrentDieselStock
                    justice.stock_lifespan = e.DieselStockLifespan
                    justice.reorder_level = e.ReorderLevelDiesel
                })
                refresh_field("just")
            })
        } 
        if(fuel_type){
            frappe.call({
                method: "omc.fuel_management.doctype.fuel_order.fuel_order.justification",
                args:{fuel_type:fuel_type}
            }).done((r) => {
                frm.doc.justp = []
                $.each(r.message, function(_i, j){
                    let justiced = frm.add_child("justp")
                    justiced.outlet = j.FuelStation;
                    justiced.avg_daily_sales = j.AverageDailyPetrolSales;
                    justiced.current_stock_level = j.CurrentPetrolStock
                    justiced.stock_lifespan = j.PetrolStockLifespan
                    justiced.reorder_level = j.ReorderLevelPetrol
                })
                refresh_field("justp")
            })
        }
        
        
        
        
    },

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
                method:"omc.fuel_management.doctype.fuel_order.fuel_order.truckdetails",
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
        if (frm.doc.workflow_state == "Placed Orders") {
            frm.add_custom_button("Place Order", () => {
               // frappe.msgprint("clicked")
               frappe.new_doc("Fuel Delivery",{}, fdp => {
                fdp.fdrar = frm.doc.name;
                frm.doc.table_mxlk.forEach( station => {
                    //fdp_tab = name of outlet table listed in fuel delivery doctype
                    let fdp_item = frappe.model.add_child(fdp, 'fdp_tab');
                    let proof = frappe.model.add_child(fdp, 'proofd');
                    fdp_item.fuel_station = station.fuel_station;
                    fdp_item.outlet_code = station.outlet_code;
                    fdp_item.volume_l = station.volume_l;
                    proof.outlet = station.fuel_station;
                })
                frm.doc.just.forEach( die => {
                    //fdp_tab = name of outlet table listed in fuel delivery doctype
                    let die_item = frappe.model.add_child(fdp, 'diesel_trends');
                    die_item.outlet = die.outlet;
                    die_item.avg_daily_sales = die.avg_daily_sales;
                    die_item.current_stock_level = die.current_stock_level;
                    die_item.stock_lifespan = die.stock_lifespan;
                    die_item.reorder_level = die.reorder_level;
                    //fdp_item.current_stock_level = station.current_stock_level;
                    
                })
                frm.doc.justp.forEach( pet => {
                    //fdp_tab = name of outlet table listed in fuel delivery doctype
                    let pet_item = frappe.model.add_child(fdp, 'petrol_trends');
                    pet_item.outlet = pet.outlet;
                    pet_item.avg_daily_sales = pet.avg_daily_sales;
                    pet_item.current_stock_level = pet.current_stock_level;
                    pet_item.stock_lifespan = pet.stock_lifespan;
                    pet_item.reorder_level = pet.reorder_level;
                    //fdp_item.current_stock_level = station.current_stock_level;
                    
                })
                
                
               });
            }).css({'background-color':'#f5a914','color':'black','font-weight': 'bold'});;
        }
    }
});

frappe.ui.form.on('Fuel Order', {
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


    
 


