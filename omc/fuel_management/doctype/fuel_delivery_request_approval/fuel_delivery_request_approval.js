// Copyright (c) 2024, Kelvin and contributors
// For license information, please see license.txt

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
   
   
   

});

frappe.ui.form.on('Fuel Delivery Request Approval', {
    fuel_type: function(frm){
        let fuel_type = frm.doc.fuel_type
        if(fuel_type == 'Diesel'){
            frappe.call({
                method: "omc.fuel_management.doctype.fuel_delivery_request_approval.fuel_delivery_request_approval.justification",
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
                method: "omc.fuel_management.doctype.fuel_delivery_request_approval.fuel_delivery_request_approval.justification",
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

    brv: function(frm){
        let truckid = frm.doc.brv;
        if(truckid){
            frappe.call({
                method:"omc.fuel_management.doctype.fuel_delivery_request_approval.fuel_delivery_request_approval.truckdetails",
                args: {truckid:truckid}
            }).done((r) => {
                console.log(r.message)
                $.each(r.message, function(_i, j){
                    // select options for outlets based on fuel truck on request fuel details
                    frm.fields_dict.table_mxlk.grid.update_docfield_property("volume_l","options", r.message)

                })
                
                
            })
        }

    },
    

    

    refresh: function(frm) {
        if (frm.doc.docstatus == 1) {
            frm.add_custom_button("Create Fuel Delivery Process", () => {
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
            }).css({'background-color':'gold','color':'black','font-weight': 'bold'});;
        }
    }
});

frappe.ui.form.on('Request Fuel Details', {
	refresh(frm) {
        frm.fields_dict.items.grid.update_docfield_property("volume_l","options",["Loan Approved","Loan Appealing"]);
	}
})

 


