// Ensure we have a dictionary to add our custom settings
const map_settings = frappe.provide("frappe.utils.map_defaults");

// Center and zoom level can be copied from the URL of
// the map view at openstreetmap.org.

// New default location (centered on Accra, Ghana)
map_settings.center = [5.6037, -0.1870]; // Latitude and Longitude for Accra
map_settings.zoom = 12; // Adjust the zoom level for a city view

// Use a different map: satellite instead of streets
// Examples can be found at https://leaflet-extras.github.io/leaflet-providers/preview/
map_settings.tiles = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
map_settings.attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';