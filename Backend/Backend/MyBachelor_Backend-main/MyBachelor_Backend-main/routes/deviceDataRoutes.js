const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const DeviceData = require('../models/DeviceData');
const Device = require('../models/Device');
const Animal = require('../models/Animal');
const WalkPath = require('../models/WalkPath');
const authenticateJWT = require('../middleware/authenticateJWT');

const movementTracker = {};
const pendingPoints = {}; // Store points before the 2-minute threshold is reached


// ✅ Device Data Route (Was in `deviceDataRoutes.js`)
// Change from app.post to router.post
router.post('/', async (req, res) => {
    try {
        const messages = req.body.messages;
        if (!messages || messages.length === 0) {
            return res.status(400).json({ error: 'No messages received' });
        }

        const savedEntries = await Promise.all(messages.map(async (data) => {
            try {
                const ident = data['ident'];
                if (!ident) throw new Error('Missing device ident');

                const device = await Device.findOne({ deviceId: ident }).exec();
                if (!device) throw new Error(`Device with ident ${ident} not found`);

                // Ensure timestamp is a valid Date object
                let timestamp = data['timestamp'];
                if (!timestamp) {
                    throw new Error(`Missing timestamp for device ${ident}`);
                }

                // Check if timestamp is in seconds (if so, multiply by 1000)
                if (typeof timestamp === 'number' && timestamp < 10000000000) {  // Timestamp is in seconds
                    timestamp = new Date(timestamp * 1000);
                } else {
                    timestamp = new Date(timestamp);  // Timestamp is already in milliseconds
                }

                // Validate the timestamp
                if (isNaN(timestamp.getTime())) {
                    throw new Error(`Invalid timestamp for device ${ident}`);
                }

                const positionLatitude = data['position.latitude'];
                const positionLongitude = data['position.longitude'];

                // ✅ Save device data
                const latestData = new DeviceData({
                    device: device._id,
                    batteryLevel: data['battery.level'],
                    deviceName: data['device.name'],
                    gnssStatus: data['gnss.status'],
                    movementStatus: data['movement.status'],
                    positionAltitude: data['position.altitude'],
                    positionDirection: data['position.direction'],
                    positionSpeed: data['position.speed'],
                    positionValid: data['position.valid'],
                    timestamp,
                    positionLatitude,
                    positionLongitude,
                });

                const savedData = await latestData.save();

                // Handle Movement Tracking
                if (!movementTracker[ident]) {
                    movementTracker[ident] = {
                        lastMovement: timestamp,
                        movementStartTime: null,
                        falseDuration: 0,
                        isSaving: false,
                    };
                }

                if (!pendingPoints[ident]) {
                    pendingPoints[ident] = [];
                }

                const deviceTracker = movementTracker[ident];
                const timeSinceLastPoint = deviceTracker.lastMovement ? (timestamp - deviceTracker.lastMovement) : 0;

                const hasValidCoordinates = positionLatitude !== undefined && 
                                           positionLatitude !== null && 
                                           positionLongitude !== undefined && 
                                           positionLongitude !== null;
                
                if (data['movement.status'] === true && hasValidCoordinates) {
                    deviceTracker.falseDuration = 0;
                    pendingPoints[ident].push({ latitude: positionLatitude, longitude: positionLongitude, timestamp });

                    if (!deviceTracker.movementStartTime) {
                        deviceTracker.movementStartTime = timestamp;
                    }

                    const movementDuration = timestamp - deviceTracker.movementStartTime;

                    if (!deviceTracker.isSaving && movementDuration >= 2 * 60 * 1000) {
                        deviceTracker.isSaving = true;

                        if (pendingPoints[ident] && pendingPoints[ident].length > 0) {
                            const points = pendingPoints[ident];
                            const validPoints = points.filter(point => point.latitude !== undefined && point.longitude !== undefined);
                            
                            if (validPoints.length > 0) {
                                await createWalkPathWithInitialPoints(device, validPoints);
                            }
                            pendingPoints[ident] = [];
                        }
                    } else if (deviceTracker.isSaving) {
                        await updateWalkPath(device, positionLatitude, positionLongitude, timestamp);
                    }
                } else if (data['movement.status'] === false) {
                    deviceTracker.falseDuration += timeSinceLastPoint;

                    if (deviceTracker.movementStartTime) {
                        deviceTracker.movementStartTime = null;
                    }

                    if (deviceTracker.isSaving && deviceTracker.falseDuration >= 1 * 60 * 1000) {
                        deviceTracker.isSaving = false;
                        deviceTracker.falseDuration = 0;

                        await WalkPath.findOneAndUpdate(
                            { device: device._id, isActive: true },
                            { isActive: false, endTime: timestamp },
                            { new: true }
                        ).exec();

                        pendingPoints[ident] = [];
                    }
                }

                deviceTracker.lastMovement = timestamp;

                return savedData;
            } catch (error) {
                console.error(`Error saving device data: ${error.message}`);
                return null;
            }
        }));

        res.status(201).json({ message: 'Device data saved successfully', data: savedEntries.filter(Boolean) });
    } catch (error) {
        console.error('Error saving device data:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// New helper function to create a walk path with initial points
async function createWalkPathWithInitialPoints(device, points) {
    try {
        // Validate that we have at least one valid point
        if (!points || points.length === 0 || 
            !points[0].latitude || !points[0].longitude) {
            console.log(`Skipping walk creation for device ${device.deviceId}: No valid coordinates`);
            return;
        }
        
        // Create a new walk path with all the pending points
        const activeWalk = new WalkPath({
            device: device._id,
            isActive: true,
            startTime: points[0].timestamp, // Use the first point's timestamp as start time
            coordinates: points
        });
        await activeWalk.save();
        console.log(`Started new walk for device ${device.deviceId} with ${points.length} initial points`);
    } catch (error) {
        console.error(`Error creating walk path with initial points: ${error.message}`);
    }
}

// Helper function to update WalkPath when movement is detected
async function updateWalkPath(device, positionLatitude, positionLongitude, timestamp) {
    try {
        // Skip if latitude or longitude is missing
        if (positionLatitude === undefined || positionLatitude === null || 
            positionLongitude === undefined || positionLongitude === null) {
            console.log(`Skipping walk update for device ${device.deviceId}: Missing coordinates`);
            return;
        }
        
        let activeWalk = await WalkPath.findOne(
            { device: device._id, isActive: true }
        ).exec();
        
        if (!activeWalk) {
            // Create a new walk path if none exists
            activeWalk = new WalkPath({
                device: device._id,
                isActive: true,
                startTime: timestamp,
                coordinates: [{ latitude: positionLatitude, longitude: positionLongitude, timestamp }]
            });
            await activeWalk.save();
            console.log(`Started new walk for device ${device.deviceId}`);
        } else {
            // Add coordinates to existing walk path
            activeWalk.coordinates.push({ latitude: positionLatitude, longitude: positionLongitude, timestamp });
            await activeWalk.save();
        }
    } catch (error) {
        console.error(`Error updating walk path: ${error.message}`);
    }
}

// GET route to fetch device data (unchanged)
router.get('/', authenticateJWT, async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: "Unauthorized: User not found" });
        }

        const userId = req.user._id;

        // Fetch devices owned by the user
        const userDevices = await Device.find({ user: userId }).exec();

        if (!userDevices.length) {
            return res.status(404).json({ message: "No devices found for this user" });
        }

        // Extract device IDs and convert them to ObjectId
        const deviceIds = userDevices.map(device => new mongoose.Types.ObjectId(device._id));

        // Fetch the latest data per device
        const deviceData = await DeviceData.aggregate([
            { $match: { device: { $in: deviceIds } } },
            { $sort: { timestamp: -1 } },
            {
                $group: {
                    _id: "$device",
                    latestData: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$latestData" } }
        ]).exec();

        // Format data with animal names - prioritize animal names over device names
        const formattedData = await Promise.all(userDevices.map(async (device) => {
            try {
                // Check if there is data for the current device
                const deviceObjectId = device._id.toString();
                const existingData = deviceData.find(data => 
                    data.device && data.device.toString() === deviceObjectId
                );
                
                // Default values if no data exists
                let animalName = 'Unknown Animal';
                let batteryLevel = 'N/A';
                let positionLatitude = 54.6892; // Default latitude
                let positionLongitude = 25.2798; // Default longitude
                let positionAltitude = 100; // Default altitude
                let isOffline = true;
                let gnssStatus = false;
                
                // Always try to get animal name first
                if (device && device.animal && mongoose.Types.ObjectId.isValid(device.animal)) {
                    const animal = await Animal.findById(device.animal).exec();
                    if (animal && animal.name) {
                        animalName = animal.name;
                    } else {
                        animalName = device.deviceName || 'Unknown Animal';
                    }
                } else {
                    animalName = device.deviceName || 'Unknown Animal';
                }

                // If device has data, use it
                if (existingData) {
                    batteryLevel = existingData.batteryLevel;
                    positionLatitude = existingData.positionLatitude;
                    positionLongitude = existingData.positionLongitude;
                    positionAltitude = existingData.positionAltitude;
                    gnssStatus = existingData.gnssStatus;
                    isOffline = !existingData.gnssStatus;
                }

                return {
                    _id: device._id,
                    device: device._id,
                    batteryLevel,
                    deviceName: device.deviceName || 'Unknown Device',
                    gnssStatus,
                    movementStatus: existingData ? existingData.movementStatus : 'Stationary',
                    positionAltitude,
                    positionDirection: existingData ? existingData.positionDirection : 'N/A',
                    positionSpeed: existingData ? existingData.positionSpeed : '0',
                    positionValid: existingData ? existingData.positionValid : false,
                    timestamp: existingData ? existingData.timestamp : new Date(),
                    positionLatitude,
                    positionLongitude,
                    animalName, // Always provide animal name
                    isOffline,
                    object_id: device._id
                };
            } catch (error) {
                console.error(`Error processing device data: ${error.message}`);
                return null;
            }
        }));

        const validData = formattedData.filter(Boolean);

        // Send the response with valid data
        res.status(200).json(validData);
    } catch (error) {
        console.error('Error fetching device data:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Helper function to calculate total distance for a walk
function calculateTotalDistance(coordinates) {
    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
        const prev = coordinates[i - 1];
        const curr = coordinates[i];
        totalDistance += calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    }
    return totalDistance;
}

function calculateDuration(coordinates) {
    if (!coordinates || coordinates.length < 2) return 0;

    let totalDurationMs = 0;

    for (let i = 1; i < coordinates.length; i++) {
        const prevTime = new Date(coordinates[i - 1].timestamp);
        const currTime = new Date(coordinates[i].timestamp);

        const diffMs = currTime - prevTime;

        // Only count gaps smaller than 2 minutes (or adjust threshold)
        if (diffMs > 0 && diffMs <= 2 * 60 * 1000) {
            totalDurationMs += diffMs;
        }
    }

    return Math.round(totalDurationMs / (1000 * 60)); // Return duration in minutes
}

  
  

// Modify the GET /walks/:deviceId route to include distance and duration
router.get('/walks/:deviceId', authenticateJWT, async (req, res) => {
    try {
      const { deviceId } = req.params;
      const userId = req.user._id;
  
      const device = await Device.findOne({ _id: deviceId, user: userId }).exec();
      if (!device) {
        return res.status(404).json({ error: "Device not found or not owned by user" });
      }
  
      // Get completed walks
      const walks = await WalkPath.find({ device: deviceId, isActive: false })
        .sort({ endTime: -1 })
        .limit(10)
        .exec();
  
      // Get currently active walk (if any)
      const activeWalk = await WalkPath.findOne({ device: deviceId, isActive: true }).exec();
  
      // Enrich finished walks with stats
      const walksWithStats = walks
        .filter(walk => walk && walk.coordinates)
        .map((walk) => {
          const distance = calculateTotalDistance(walk.coordinates);
          const duration = calculateDuration(walk.coordinates);
          return {
            ...walk.toObject(),
            distance,
            duration,
          };
        });
  
      // ✅ Declare before using it
      let activeWalkWithStats = null;
  
      if (activeWalk && activeWalk.coordinates?.length > 0) {
        const distance = calculateTotalDistance(activeWalk.coordinates);
        const duration = calculateDuration(activeWalk.coordinates); // Already fixed to ignore gaps
        activeWalkWithStats = {
          ...activeWalk.toObject(),
          distance,
          duration,
        };
      }
  
      return res.status(200).json({
        recentWalks: walksWithStats,
        activeWalk: activeWalkWithStats,
      });
    } catch (error) {
      console.error('Error fetching walk data:', error);
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  });
  
  
// Helper function to calculate distance between two coordinates in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0; // Validate coordinates
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    const distance = R * c; // Distance in km
    return distance;
}

// Helper function to convert degrees to radians
function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

module.exports = router;