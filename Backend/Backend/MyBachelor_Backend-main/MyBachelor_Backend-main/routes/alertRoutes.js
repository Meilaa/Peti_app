const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert'); // Assuming alertModel.js is in the 'models' directory
const Location = require('../models/Location'); // Assuming locationModel.js is in the 'models' directory
const Animal = require('../models/Animal'); // Assuming animalModel.js is in the 'models' directory

// Create a new alert
router.post('/', async (req, res) => {
  try {
    const { animalId, alertType, description, threshold, location } = req.body;

    // Validate required fields
    if (!animalId || !alertType || !threshold || !location) {
      return res.status(400).json({ message: 'Missing required fields: animalId, alertType, threshold, location' });
    }

    // Validate if the animal exists
    const animal = await Animal.findById(animalId);
    if (!animal) {
      return res.status(404).json({ message: 'Animal not found.' });
    }

    // Validate threshold fields
    if (!threshold.radius || !threshold.latitude || !threshold.longitude) {
      return res.status(400).json({ message: 'Missing required threshold fields: radius, latitude, longitude' });
    }

    // Validate location fields
    if (!location.latitude || !location.longitude) {
      return res.status(400).json({ message: 'Missing required location fields: latitude, longitude' });
    }

    // Create a new alert
    const newAlert = new Alert({
      animal: animalId,
      alertType,
      description,
      threshold,
      location,
      timestamp: Date.now(),
    });

    await newAlert.save();
    res.status(201).json({ message: 'Alert created successfully', alert: newAlert });
  } catch (error) {
    console.error('Error while creating alert:', error);
    res.status(500).json({ message: 'Server error, please try again later.', error: error.message });
  }
});


// Get all alerts for an animal
router.get('/animal/:animalId', async (req, res) => {
  try {
    const alerts = await Alert.find({ animal: req.params.animalId }).sort({ timestamp: -1 });
    if (alerts.length === 0) {
      return res.status(404).json({ message: 'No alerts found for this animal.' });
    }
    res.status(200).json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
});

// Get the latest alert for an animal
router.get('/animal/:animalId/latest', async (req, res) => {
  try {
    const latestAlert = await Alert.findOne({ animal: req.params.animalId }).sort({ timestamp: -1 });
    if (!latestAlert) {
      return res.status(404).json({ message: 'No alerts found for this animal.' });
    }
    res.status(200).json(latestAlert);
  } catch (error) {
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
});

// Get all alerts (optional for admins)
router.get('/', async (req, res) => {
  try {
    const alerts = await Alert.find().populate('animal', 'name'); // Populate animal name for each alert
    res.status(200).json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
});

// Delete an alert by ID
router.delete('/:alertId', async (req, res) => {
  try {
    const deletedAlert = await Alert.findByIdAndDelete(req.params.alertId);
    if (!deletedAlert) {
      return res.status(404).json({ message: 'Alert not found.' });
    }
    res.status(200).json({ message: 'Alert deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
});

// Helper function to calculate distance between two geographical points (in km)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

// Helper function to convert degrees to radians
const toRad = (value) => {
  return value * (Math.PI / 180);
};

module.exports = router;
