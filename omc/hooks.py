app_name = "omc"
app_title = "Fuel Management"
app_publisher = "Kelvin"
app_description = "App management system for Downstream OMCs"
app_email = "otuahenedev@gmail.com"
app_license = "mit"
# required_apps = []

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/omc/css/omc.css"
# app_include_js = "/assets/omc/js/omc.js"
app_include_js = [
    "/assets/omc/js/map_defaults.js"
     "/assets/omc/css/omc.css"

]

# include js, css files in header of web template
# web_include_css = "/assets/omc/css/omc.css"
# web_include_js = "/assets/omc/js/omc.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "omc/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "omc/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "omc.utils.jinja_methods",
# 	"filters": "omc.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "omc.install.before_install"
# after_install = "omc.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "omc.uninstall.before_uninstall"
# after_uninstall = "omc.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "omc.utils.before_app_install"
# after_app_install = "omc.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "omc.utils.before_app_uninstall"
# after_app_uninstall = "omc.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "omc.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
 	#"*": {
 	#	"on_update": "method",
 	##	"on_trash": "method"
 	#},
     "Outlet Sales Credit Log": {
        "after_insert": "omc.credit__facilitation.doctype.outlet_credit_sales_log.update_credit_utilization",
        "on_update": "omc.credit__facilitation.doctype.outlet_credit_sales_log.update_credit_utilization"
    },
   
    "Payment Entry": {
        "on_submit": "omc.fuel_management.doctype.statutory_payment.statutory_payment.tax_management.update_statutory_payment_status"
    },
     "Fuel Station Pricing": {
        "on_update": "omc.fuel_management.doctype.fuel_station_pricing.fuel_station_pricing.update_customer_product_pricing"
    }
 }

# Scheduled Tasks
# ---------------

scheduler_events = {
# 	"all": [
# 		"omc.tasks.all"
# 	],
 	"daily": ["omc.send_credit_utilization_alert"],
# 	"hourly": [
# 		"omc.tasks.hourly"
# 	],
# 	"weekly": [
# 		"omc.tasks.weekly"
# 	],
 	"monthly": [
 		"omc.adjust_credit_limits"
	],
 }

fixtures = [
    {
        "dt": "Report",
        "filters": [
            ["name", "=", "Credit Risk Report"]
        ]
    }
]

# Testing
# -------

# before_tests = "omc.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "omc.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "omc.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["omc.utils.before_request"]
# after_request = ["omc.utils.after_request"]

# Job Events
# ----------
# before_job = ["omc.utils.before_job"]
# after_job = ["omc.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"omc.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

