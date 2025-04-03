const mongoose = require('mongoose');

// Define the alert schema
const alertSchema = new mongoose.Schema({
  animal: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true }, // Reference to the animal document
  alertType: { type: String, required: true }, // Type of the alert (e.g., "Geofence", "Speed", etc.)
  description: { type: String, required: true }, // Description of the alert
  threshold: { // Threshold data for triggering the alert (could be a distance or any other criteria)
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radius: { type: Number, required: true } // Example of radius for a geofence
  },
  location: { // Current location data where the alert was triggered
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  status: { type: String, default: 'resolved', enum: ['triggered', 'resolved'] }, // Status of the alert (triggered or resolved)
  timestamp: { type: Date, default: Date.now } // When the alert was created
});

// Create the model based on the schema
module.exports = mongoose.model('Alert', alertSchema);
