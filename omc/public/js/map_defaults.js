const map_settings = frappe.provide("frappe.utils.map_defaults");

// Center the map on Ghana
map_settings.center = [7.9465, -1.0232];  // Latitude, Longitude for Ghana
map_settings.zoom = 7;

// Use an alternate map tile (optional, clean look)
map_settings.tiles = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
map_settings.attribution = "© OpenStreetMap contributors";