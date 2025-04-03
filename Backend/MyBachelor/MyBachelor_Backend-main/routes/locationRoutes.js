const express = require('express');
const mongoose = require('mongoose'); // Add this line
const router = express.Router();
const Location = require('../models/Location'); // Assuming locationModel.js is in the 'models' directory
const Animal = require('../models/Animal'); // Assuming animalModel.js is in the 'models' directory

// Create a new location for an animal
router.post('/', async (req, res) => {
  try {
    const { animalId, latitude, longitude } = req.body;

    console.log('Received animalId:', animalId);

    // Validate required fields
    if (!animalId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'Missing required fields: animalId, latitude, longitude' });
    }

    // Validate if animalId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(animalId)) {
      return res.status(400).json({ message: 'Invalid animalId format.' });
    }

    // Validate if the animal exists
    const animal = await Animal.findById(animalId);
    if (!animal) {
      return res.status(404).json({ message: 'Animal not found.', animalId });
    }

    // Validate latitude and longitude
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: 'Invalid latitude or longitude values.' });
    }

    // Create a new location entry
    const newLocation = new Location({ animal: animalId, latitude, longitude });
    await newLocation.save();
    res.status(201).json({ message: 'Location added successfully.', location: newLocation });
  } catch (error) {
    console.error('Error while creating location:', error);
    res.status(500).json({ message: 'Server error, please try again later.', error: error.message });
  }
});

// Get all locations for a specific animal
router.get('/animal/:animalId', async (req, res) => {
  try {
    const { animalId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(animalId)) {
      return res.status(400).json({ message: 'Invalid animalId format.' });
    }

    const locations = await Location.find({ animal: animalId });
    if (!locations.length) {
      return res.status(404).json({ message: 'No locations found for this animal.' });
    }

    res.status(200).json({ message: 'Locations retrieved successfully.', locations });
  } catch (error) {
    console.error('Error while retrieving locations:', error);
    res.status(500).json({ message: 'Server error, please try again later.', error: error.message });
  }
});


// Get the most recent location of an animal
router.get('/animal/:animalId/latest', async (req, res) => {
  try {
    const latestLocation = await Location.findOne({ animal: req.params.animalId }).sort({ timestamp: -1 });
    if (!latestLocation) {
      return res.status(404).json({ message: 'No locations found for this animal.' });
    }
    res.status(200).json(latestLocation);
  } catch (error) {
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
});

// Get all locations (optional, can be useful for admin purposes)
router.get('/', async (req, res) => {
  try {
    const locations = await Location.find().populate('animal', 'name'); // Populate animal name for each location
    res.status(200).json(locations);
  } catch (error) {
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
});

// Delete a location by ID (if needed)
router.delete('/:locationId', async (req, res) => {
  try {
    const deletedLocation = await Location.findByIdAndDelete(req.params.locationId);
    if (!deletedLocation) {
      return res.status(404).json({ message: 'Location not found.' });
    }
    res.status(200).json({ message: 'Location deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
});

module.exports = router;
