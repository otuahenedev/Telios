let alreadySet = false; // Custom variable to track execution

$(document).on("form-refresh", function (event, frm) {
    if (!alreadySet) { // Check if the logic has already been applied
        frappe.ui.form.on(frm.doctype, {
            refresh: function (frm) {
                if (frm.timeline) {
                    frm.timeline.remove_action('New Email');
                    frm.timeline.remove_action('New Event');
                }
                // Your logic here
                console.log(`Form refreshed for ${frm.docname}`);
            }
        });

        alreadySet = true; // Set the flag to prevent further executions
    }
});