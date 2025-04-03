const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const Animal = require("../models/Animal");
const User = require("../models/User");
const Device = require("../models/Device");
const authenticateJWT = require("../middleware/authenticateJWT");

router.post("/", async (req, res) => {
  try {
    const { name, gender, breed, age, height, weight, owner, device } = req.body;

    console.log("Incoming request payload:", req.body);

    // Validate required fields
    if (!name || !gender || !breed || !age || !height || !weight || !owner || !device) {
      return res.status(400).json({ message: "All fields are required, including device ID." });
    }

    // Skip trying to find the device — you already received its ObjectId (device)
    const deviceObjectId = new mongoose.Types.ObjectId(device); // Expecting device to already be the _id.

    const newAnimal = new Animal({
      name,
      gender,
      breed,
      age,
      height,
      weight,
      owner: new mongoose.Types.ObjectId(owner),
      device: deviceObjectId,  // ✅ Directly use the received _id
    });

    await newAnimal.save();

    return res.status(201).json({
      message: "Animal created successfully!",
      animal: newAnimal,
    });
  } catch (error) {
    console.error("Error creating animal:", error);
    return res.status(500).json({ message: "Error creating animal.", error: error.message });
  }
});
// ✅ Update animal details (Includes `age` update)
router.put("/:id", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    if (updatedData.age && isNaN(updatedData.age)) {
      return res.status(400).json({ message: "Invalid age format" });
    }

    const updatedAnimal = await Animal.findByIdAndUpdate(id, updatedData, {
      new: true,
    }).populate("device owner");

    if (!updatedAnimal) {
      return res.status(404).json({ message: "Animal not found" });
    }

    res.status(200).json({
      message: "Animal updated successfully",
      animal: updatedAnimal,
    });
  } catch (error) {
    res.status(400).json({ message: "Error updating animal", error });
  }
});

router.get("/", authenticateJWT, async (req, res) => {
  try {
    console.log("Fetching animals for user ID:", req.user.id); // Log the user to confirm
    const animals = await Animal.find({ owner: req.user.id })
      .populate("device") // Ensure "device" is a valid field in Animal schema
      .populate("owner", "email name");

    console.log("Fetched Animals:", animals);
    res.status(200).json(animals);
  } catch (error) {
    console.error("Error fetching animals:", error);
    res.status(500).json({ message: "Error fetching animals", error });
  }
});


// ✅ Fetch a single animal by ID
router.get("/:id", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const animal = await Animal.findById(id).populate("device owner");

    if (!animal || animal.owner.toString() !== req.user.id) {
      return res.status(404).json({ message: "Animal not found" });
    }

    res.status(200).json(animal);
  } catch (error) {
    res.status(500).json({ message: "Error fetching animal", error });
  }
});

router.delete("/:id", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const animal = await Animal.findOne({ _id: id, owner: req.user.id });

    if (!animal) {
      return res.status(404).json({ message: "Animal not found" });
    }

    // If the animal has a device, delete the device first
    if (animal.device) {
      await Device.findByIdAndDelete(animal.device);
    }

    await Animal.deleteOne({ _id: id, owner: req.user.id });

    res.status(200).json({ message: "Animal and associated device deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting animal and device", error });
  }
});

// Update animal temperament
router.put("/:id/temperament", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { temperament } = req.body;

    // Log the incoming request for debugging
    console.log(`📝 PUT /animals/${id}/temperament request received`, { temperament });

    if (!temperament || !['aggressive', 'friendly', 'neutral'].includes(temperament)) {
      return res.status(400).json({ message: "Invalid temperament value. Must be 'aggressive', 'friendly', or 'neutral'." });
    }

    // Ensure animalId is valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid animal ID format" });
    }

    const animal = await Animal.findOne({ _id: id, owner: req.user.id });

    if (!animal) {
      return res.status(404).json({ message: "Animal not found" });
    }

    // Update the temperament
    animal.temperament = temperament;
    await animal.save();

    // Return complete animal object with populated references
    const updatedAnimal = await Animal.findById(id).populate("device owner");

    console.log(`✅ Animal ${id} temperament updated to: ${temperament}`);
    
    // Set explicit content-type header
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      message: "Animal temperament updated successfully",
      animal: updatedAnimal
    });
  } catch (error) {
    console.error(`❌ Error updating animal temperament:`, error);
    res.status(500).json({ message: "Error updating animal temperament", error: error.message });
  }
});

// Add a new endpoint to mark an animal as lost or found
router.put('/:id/lost', authenticateJWT, async (req, res) => {
  try {
    console.log(`🔍 PUT /animals/${req.params.id}/lost request received`);
    console.log(`Request body:`, req.body);
    
    const { isLost } = req.body;
    
    // Validate the isLost value
    if (typeof isLost !== 'boolean') {
      return res.status(400).json({
        message: 'Invalid request: isLost must be a boolean value'
      });
    }
    
    // Validate the animal ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid animal ID format'
      });
    }
    
    // Find and update the animal
    const animal = await Animal.findById(req.params.id)
      .populate('owner')
      .populate('device');
    
    if (!animal) {
      return res.status(404).json({
        message: 'Animal not found'
      });
    }
    
    // Check ownership
    if (animal.owner._id.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        message: 'You are not authorized to update this animal'
      });
    }
    
    // Check if the animal is aggressive
    if (isLost && animal.temperament !== 'aggressive') {
      return res.status(400).json({
        message: 'Only aggressive dogs can be marked as lost for public safety tracking',
        details: 'Update the dog\'s temperament to aggressive before marking it as lost'
      });
    }
    
    // Update the animal
    animal.isLost = isLost;
    animal.lastUpdated = new Date();
    
    // If marking as lost, record the time
    if (isLost) {
      animal.lostSince = new Date();
      console.log(`📋 Animal ${animal.name} marked as lost at ${animal.lostSince}`);
    } else {
      animal.lostSince = null;
      console.log(`✅ Animal ${animal.name} marked as found`);
    }
    
    await animal.save();
    
    // Send notification to other users if animal is marked as lost
    if (isLost) {
      // Here you would implement notification logic
      console.log(`🔔 Notification sent: Aggressive dog ${animal.name} is lost!`);
    }
    
    // Return the updated animal
    res.status(200).json({
      message: isLost ? 'Animal marked as lost' : 'Animal marked as found',
      animal
    });
    
  } catch (error) {
    console.error('Error updating animal lost status:', error);
    res.status(500).json({
      message: 'Error updating animal lost status',
      error: error.message
    });
  }
});

// Add an endpoint to get all lost aggressive dogs
router.get('/lost', authenticateJWT, async (req, res) => {
  try {
    console.log(`🔍 GET /animals/lost request received from user: ${req.user.id}`);
    
    // Find all aggressive dogs that are marked as lost
    const lostDogs = await Animal.find({
      isLost: true,
      temperament: 'aggressive'
    })
    .populate('owner', 'email username') // Only include necessary owner info
    .populate('device');
    
    console.log(`✅ Found ${lostDogs.length} lost aggressive dogs`);
    
    // Return the lost dogs
    res.status(200).json(lostDogs);
    
  } catch (error) {
    console.error('Error fetching lost dogs:', error);
    res.status(500).json({
      message: 'Error fetching lost dogs',
      error: error.message
    });
  }
});

// Add an endpoint to get all lost animals belonging to the current user
router.get('/my-lost', authenticateJWT, async (req, res) => {
  try {
    console.log(`🔍 GET /animals/my-lost request received from user: ${req.user.id}`);
    
    // Find all lost animals that belong to the current user
    const myLostAnimals = await Animal.find({
      owner: req.user.id,
      isLost: true
    })
    .populate('device');
    
    console.log(`✅ Found ${myLostAnimals.length} lost animals for user: ${req.user.id}`);
    
    // Return the lost animals
    res.status(200).json(myLostAnimals);
    
  } catch (error) {
    console.error('Error fetching user\'s lost animals:', error);
    res.status(500).json({
      message: 'Error fetching your lost animals',
      error: error.message
    });
  }
});

module.exports = router;