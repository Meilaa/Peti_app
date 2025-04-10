import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform, Alert, Switch, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import colors from '../../constants/colors';
import DogImage from '../../../assets/images/dog_pics.png';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import environments from '../../constants/enviroments';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { Picker } from '@react-native-picker/picker';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Responsive font size function
const normalize = (size) => {
  const scale = width / 375; // 375 is standard iPhone width
  const newSize = size * scale;
  return Math.round(newSize);
};

const DogProfile = () => {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [animals, setAnimals] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [newProfile, setNewProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [trackerId, setTrackerId] = useState(''); // New state for tracker ID
  const [temperamentModalVisible, setTemperamentModalVisible] = useState(false);
  const [selectedTemperament, setSelectedTemperament] = useState('neutral');

  const [trackerModalVisible, setTrackerModalVisible] = useState(false);
  const [dogProfileModalVisible, setDogProfileModalVisible] = useState(false);
  const [createdDevice, setCreatedDevice] = useState(null); // Store created device after adding tracker

  // Add the tempermanetUpdateStatus to component state
  const [temperamentUpdateStatus, setTemperamentUpdateStatus] = useState(null);

  // Add this state variable at the top of the component with other state declarations
  const [recentlyChanged, setRecentlyChanged] = useState(false);

  // Add state variables for the lost status control
  const [isLost, setIsLost] = useState(false);
  const [isUpdatingLostStatus, setIsUpdatingLostStatus] = useState(false);
  const [showLostControls, setShowLostControls] = useState(false);

  // Fetch All Animals on Load
  useEffect(() => {
    const fetchAnimals = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('authToken');
        const response = await fetch(`${environments.API_BASE_URL}/api/animals/`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          data.forEach(animal => {
            animal.age = animal.age || 'N/A';  // Ensure age is present
          });
          setAnimals(data);   
        } else {
          setAnimals([]);
        }
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnimals();
  }, []);

  // Get Current Animal
  const currentAnimal = animals[currentIndex] || null;

  // Get appropriate temperament info based on current animal
  const getTemperamentInfo = (temperament = 'neutral') => {
    switch(temperament) {
      case 'aggressive':
        return {
          icon: 'dog-side',
          color: colors.aggressive,
          label: 'Aggressive',
          backgroundColor: colors.aggressiveBg
        };
      case 'friendly':
        return {
          icon: 'dog',
          color: colors.friendly,
          label: 'Friendly',
          backgroundColor: colors.friendlyBg
        };
      default:
        return {
          icon: 'dog-side',
          color: colors.neutral,
          label: 'Neutral',
          backgroundColor: colors.neutralBg
        };
    }
  };

  // Open Edit Modal
  const handleEditPress = () => {
    if (!currentAnimal) return;
    setNewProfile(currentAnimal);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleAddPress = () => {
    setTrackerId('');
    setNewProfile({ name: '', breed: '', age: '', gender: '', height: '', weight: '' });
    setCreatedDevice(null);
    setTrackerModalVisible(true);
  };

  const handleRegisterTracker = async () => {
    if (!trackerId) {
      alert('Please enter a valid Tracker ID');
      return;
    }
  
    try {
      const token = await AsyncStorage.getItem('authToken');
      const ownerId = await AsyncStorage.getItem('ownerId');
  
      const response = await fetch(`${environments.API_BASE_URL}/api/devices/addTracker`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceName: `Device for ${trackerId}`,
          trackerID: trackerId,
          userId: ownerId,
        }),
      });
  
      // ✅ **Check if response is JSON**
      const responseText = await response.text();
      if (!response.ok) {
        console.error('Register Tracker Error:', responseText);
        alert(`Failed to register tracker: ${responseText}`);
        return;
      }
  
      const data = JSON.parse(responseText); // ✅ **Safe JSON parsing**
      console.log('Device Created:', data.device);
  
      setCreatedDevice(data.device); 
      setTrackerModalVisible(false);
      setDogProfileModalVisible(true);
    } catch (error) {
      console.error('Error during tracker registration:', error);
      alert('Failed to register tracker.');
    }
  };
  
  const linkAnimalToDevice = async (animalId, deviceId) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
  
      const response = await fetch(`${environments.API_BASE_URL}/api/devices/linkAnimal`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackerObjectId: deviceId,  
          animalId: animalId,        
        }),
      });
  
      // ✅ **Check if response is JSON**
      const responseText = await response.text();
      if (!response.ok) {
        console.error('Link Animal Error:', responseText);
        alert(`Failed to link device with animal: ${responseText}`);
        return false;
      }
  
      const data = JSON.parse(responseText); // ✅ **Safe JSON parsing**
      console.log('Backend response (Link Animal):', data);
  
      return true;
    } catch (error) {
      console.error('Error linking device to animal:', error);
      alert('Error linking device to animal.');
      return false;
    }
  };
  

  const handleSaveDogProfile = async () => {
    if (!createdDevice) {
      alert('Device not found. Please register tracker again.');
      return;
    }
  
    if (!newProfile.name || !newProfile.breed || !newProfile.age || !newProfile.gender || !newProfile.height || !newProfile.weight) {
      alert('Please fill out all required fields.');
      return;
    }
  
    try {
      const token = await AsyncStorage.getItem('authToken');
      const ownerId = await AsyncStorage.getItem('ownerId');
  
      // Step 1: Create the animal profile
      const newAnimal = {
        ...newProfile,
        owner: ownerId,
        device: createdDevice._id, // Assign the device directly
        trackerID: createdDevice.deviceId,
        age: newProfile.age,
      };
  
      console.log('🐶 Payload being sent:', newAnimal);
  
      const createAnimalResponse = await fetch(`${environments.API_BASE_URL}/api/animals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAnimal),
      });
  
      const createAnimalText = await createAnimalResponse.text(); // Get response as text first
      if (!createAnimalResponse.ok) {
        console.error('❌ Create Animal Error:', createAnimalText);
        alert(`Failed to create animal: ${createAnimalText}`);
        return;
      }
  
      const createAnimalData = JSON.parse(createAnimalText); // Parse JSON safely
      console.log('✅ Backend response (Create Animal):', createAnimalData);
  
      // Step 2: Update the device with the created animal ID
      const updateDeviceResponse = await fetch(`${environments.API_BASE_URL}/api/devices/${createdDevice._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ animal: createAnimalData.animal._id }),
      });
  
      const updateDeviceText = await updateDeviceResponse.text(); // Get response as text
      if (!updateDeviceResponse.ok) {
        console.error('❌ Update Device Error:', updateDeviceText);
        alert(`Failed to update device: ${updateDeviceText}`);
        return;
      }
  
      const updateDeviceData = JSON.parse(updateDeviceText); // Parse JSON safely
      console.log('✅ Backend response (Update Device):', updateDeviceData);
  
      // Step 3: Update the frontend state
      setAnimals([...animals, createAnimalData.animal]);
      setCurrentIndex(animals.length);
      setDogProfileModalVisible(false);
    } catch (error) {
      console.error('❌ Error saving dog profile:', error);
      alert('Failed to save dog profile.');
    }
  };

  // Handle Delete Animal
  const handleDelete = async () => {
    try {
      if (!currentAnimal || !currentAnimal._id) {
        alert('No animal profile found.');
        return;
      }
  
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        alert('Authentication error. Please log in again.');
        return;
      }
  
      // Step 1: Delete Device if it exists
      if (currentAnimal.device?._id) {
        const deviceId = currentAnimal.device._id;  // Only pass the string _id
      
        const deviceResponse = await fetch(`${environments.API_BASE_URL}/api/devices/${deviceId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      
        if (!deviceResponse.ok) {
          const deviceError = await deviceResponse.json();
          console.error('Failed to delete device:', deviceError);
          alert(deviceError.message || 'Failed to delete associated device.');
          return;
        }
      
        console.log('Device deleted successfully');
      }
      
  
      // Step 2: Delete Animal
      const animalResponse = await fetch(`${environments.API_BASE_URL}/api/animals/${currentAnimal._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
  
      if (animalResponse.ok) {
        alert('Animal and associated device deleted successfully!');
        const updatedAnimals = animals.filter((animal) => animal._id !== currentAnimal._id);
        setAnimals(updatedAnimals);
        setCurrentIndex(updatedAnimals.length > 0 ? 0 : null);
        setConfirmDelete(false);
      } else {
        const animalError = await animalResponse.json();
        alert(animalError.message || 'Failed to delete animal.');
      }
  
    } catch (error) {
      console.error('Error deleting animal and device:', error);
      alert('Something went wrong. Please try again later.');
    }
  };
  const handleSaveEdit = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
  
      const response = await fetch(`${environments.API_BASE_URL}/api/animals/${currentAnimal._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProfile),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        alert(data.message || 'Failed to update profile.');
        return;
      }
  
      const updatedAnimals = animals.map((animal) =>
        animal._id === data.animal._id ? data.animal : animal
      );
  
      setAnimals(updatedAnimals);
      setModalVisible(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Something went wrong. Please try again.');
    }
  };
  
  // Handle Delete Confirmation
  const handleDeleteConfirm = () => {
    setConfirmDelete(true);
  };

  // Handle Cancel Deletion
  const handleDeleteCancel = () => {
    setConfirmDelete(false);
  };

  // Navigation Functions
  const handleNext = () => {
    if (currentIndex < animals.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Open Temperament Modal
  const handleTemperamentPress = () => {
    if (!currentAnimal) return;
    setSelectedTemperament(currentAnimal.temperament || 'neutral');
    setTemperamentModalVisible(true);
  };

  // Update the updateTemperament function to log detailed information 
  const updateTemperament = async (newTemperament) => {
    if (!currentAnimal || !currentAnimal._id) {
      Alert.alert("Error", "No animal selected");
      return;
    }

    console.log(`Updating temperament for animal: ${currentAnimal._id}, name: ${currentAnimal.name}, to: ${newTemperament}`);

    // Save temperament change in AsyncStorage immediately for local updates
    try {
      // Update temperament changes list for UI highlighting
      const storedChangesString = await AsyncStorage.getItem('temperamentChanges') || '[]';
      const storedChanges = JSON.parse(storedChangesString);
      
      // Add this change with timestamp
      const newChange = {
        animalId: currentAnimal._id,
        timestamp: Date.now(),
        temperament: newTemperament
      };
      
      // Filter out old changes for this animal and add the new one
      const updatedChanges = storedChanges
        .filter(change => change.animalId !== currentAnimal._id)
        .concat(newChange);
        
      // Only keep changes from the last 5 seconds
      const recentChanges = updatedChanges.filter(
        change => Date.now() - change.timestamp < 5000
      );
      
      console.log("Storing temperament change:", newChange);
      await AsyncStorage.setItem('temperamentChanges', JSON.stringify(recentChanges));
      
      // Update the animals array directly instead of using setCurrentAnimal
      const updatedAnimals = animals.map(animal => 
        animal._id === currentAnimal._id 
          ? { ...animal, temperament: newTemperament }
          : animal
      );
      
      // Update local state for immediate UI update
      setAnimals(updatedAnimals);
      // Close the modal after setting the state
      setTemperamentModalVisible(false);
      
      // Show feedback to user
      setTemperamentUpdateStatus({
        message: `${currentAnimal.name || currentAnimal.animalName}'s temperament updated to ${newTemperament}`,
        type: 'success'
      });
      
      // Verify the temperament change is in AsyncStorage
      const verifyStoredChanges = await AsyncStorage.getItem('temperamentChanges');
      console.log("Verified temperament changes in storage:", verifyStoredChanges);
      
      // Clear status after 3 seconds
      setTimeout(() => setTemperamentUpdateStatus(null), 3000);
    } catch (error) {
      console.error("Error saving temperament locally:", error);
    }

    // Server update with proper authentication
    try {
      // Get the authentication token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${environments.API_BASE_URL}/api/animals/${currentAnimal._id}/temperament`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Add the authentication token
        },
        body: JSON.stringify({
          temperament: newTemperament
        }),
      });

      // Check if the response is ok
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      // Try to parse JSON, but handle cases where the response might not be JSON
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      console.log("Server update successful:", data);
    } catch (error) {
      console.error("Error updating temperament on server:", error);
      
      // Show user feedback about the server issue but reassure about local update
      Alert.alert(
        "Sync Issue",
        "Your change was saved locally but couldn't sync with the server. Will retry automatically.",
        [{ text: "OK" }]
      );
      
      // Schedule a retry in the background
      setTimeout(() => {
        retryTemperamentUpdate(currentAnimal._id, newTemperament);
      }, 10000); // Try again in 10 seconds
    }
  };

  // Update the retry function to include the token
  const retryTemperamentUpdate = async (animalId, temperament) => {
    try {
      // Get the authentication token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.error('No authentication token found for retry');
        return;
      }
      
      const response = await fetch(`${environments.API_BASE_URL}/api/animals/${animalId}/temperament`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Add the authentication token
        },
        body: JSON.stringify({
          temperament: temperament
        }),
      });
      
      if (response.ok) {
        console.log("Retry successful for animal ID:", animalId);
      } else {
        console.error("Retry failed with status:", response.status);
        // Schedule another retry
        setTimeout(() => {
          retryTemperamentUpdate(animalId, temperament);
        }, 30000); // Try again in 30 seconds
      }
    } catch (error) {
      console.error("Error in retry attempt:", error);
    }
  };

  // Add this useEffect at the component level, not inside renderTemperamentBadge
  useEffect(() => {
    if (!currentAnimal) return;
    
    const checkRecentChange = async () => {
      try {
        const storedChangesString = await AsyncStorage.getItem('temperamentChanges');
        if (storedChangesString) {
          const storedChanges = JSON.parse(storedChangesString);
          const isChanged = storedChanges.some(change => change.animalId === currentAnimal._id);
          setRecentlyChanged(isChanged);
        }
      } catch (err) {
        console.error("Error checking recent changes:", err);
      }
    };
    
    checkRecentChange();
    // Check every second
    const interval = setInterval(checkRecentChange, 1000);
    return () => clearInterval(interval);
  }, [currentAnimal]);

  // Update renderTemperamentBadge to remove hooks
  const renderTemperamentBadge = () => {
    if (!currentAnimal) return null;
    
    const temperamentInfo = getTemperamentInfo(currentAnimal.temperament);
    
    return (
      <View style={[
        styles.temperamentBadge, 
        { backgroundColor: temperamentInfo.backgroundColor },
        recentlyChanged && styles.recentlyChangedTemperament
      ]}>
        <MaterialCommunityIcons 
          name={temperamentInfo.icon} 
          size={24} 
          color={temperamentInfo.color} 
        />
        <Text style={[styles.temperamentBadgeText, { color: temperamentInfo.color }]}>
          {temperamentInfo.label}
        </Text>
      </View>
    );
  };

  // Add useEffect to initialize lost status from current animal
  useEffect(() => {
    if (currentAnimal && currentAnimal.isLost !== undefined) {
      setIsLost(currentAnimal.isLost);
    }
  }, [currentAnimal]);

  // Add function to toggle lost status
  const toggleLostStatus = async () => {
    if (!currentAnimal) return;
    
    setIsUpdatingLostStatus(true);
    const newLostStatus = !isLost;
  
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${environments.API_BASE_URL}/api/animals/${currentAnimal._id}/lost`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isLost: newLostStatus,
          forceUpdate: false // First try without forcing
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle case where temperament needs to change
        if (errorData.requiresTemperamentChange) {
          const shouldUpdate = await new Promise((resolve) => {
            Alert.alert(
              "Temperament Change Required",
              "For safety reasons, only aggressive dogs can be marked as lost. Change temperament to aggressive?",
              [
                { text: "Cancel", onPress: () => resolve(false) },
                { text: "Change", onPress: () => resolve(true) }
              ]
            );
          });
  
          if (shouldUpdate) {
            // Retry with forceUpdate
            const forceResponse = await fetch(`${environments.API_BASE_URL}/api/animals/${currentAnimal._id}/lost`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                isLost: newLostStatus,
                forceUpdate: true
              })
            });
  
            if (!forceResponse.ok) {
              throw new Error('Failed to update after temperament change');
            }
  
            const updatedAnimal = await forceResponse.json();
            updateLocalState(updatedAnimal.animal);
            showSuccessAlert(newLostStatus);
            return;
          } else {
            setIsUpdatingLostStatus(false);
            return;
          }
        }
        
        throw new Error(errorData.message || 'Failed to update lost status');
      }
  
      const data = await response.json();
      updateLocalState(data.animal);
      showSuccessAlert(newLostStatus);
  
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsUpdatingLostStatus(false);
    }
  };
  
  // Helper functions
  const updateLocalState = (animal) => {
    const updatedAnimals = animals.map(a => 
      a._id === animal._id ? animal : a
    );
    setAnimals(updatedAnimals);
    setIsLost(animal.isLost);
  };
  
  const showSuccessAlert = (isLost) => {
    if (isLost) {
      Alert.alert(
        "Dog Marked as Lost",
        "Your dog has been reported as lost. Nearby users will be notified.",
        [{ text: "OK" }]
      );
    }
  };
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.yellow} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContainer}>
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={handlePrev} disabled={currentIndex === 0}>
            <MaterialIcons name="arrow-back-ios-new" size={20} color={currentIndex === 0 ? 'gray' : colors.yellow} />
          </TouchableOpacity>
          <View style={styles.imageContainer}>
            <Image source={DogImage} style={styles.profileImage} />
          </View>
          <TouchableOpacity onPress={handleNext} disabled={currentIndex >= animals.length - 1}>
            <MaterialIcons name="arrow-forward-ios" size={20} color={currentIndex >= animals.length - 1 ? 'gray' : colors.yellow} />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{currentAnimal?.name || 'No Dog Found'}</Text>
        
        {/* Add temperament badge below the name */}
        {renderTemperamentBadge()}
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <View style={styles.buttonColumn}>
          <TouchableOpacity style={styles.button} onPress={handleAddPress}>
            <FontAwesome6 name="add" size={20} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.buttonText}>Add</Text>
        </View>
        <View style={styles.buttonColumn}>
          <TouchableOpacity style={styles.button} onPress={handleEditPress}>
            <FontAwesome6 name="edit" size={18} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.buttonText}>Edit</Text>
        </View>
        <View style={styles.buttonColumn}>
          <TouchableOpacity style={styles.button} onPress={handleDeleteConfirm}>
            <FontAwesome6 name="trash" size={20} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.buttonText}>Delete</Text>
        </View>
        <View style={styles.buttonColumn}>
          <TouchableOpacity 
            style={[
              styles.button, 
              currentAnimal?.temperament === 'aggressive' ? styles.aggressiveButton :
              currentAnimal?.temperament === 'friendly' ? styles.friendlyButton :
              styles.button
            ]} 
            onPress={handleTemperamentPress}>
            <MaterialCommunityIcons 
              name="dog-side" 
              size={20} 
              color={colors.white} 
            />
          </TouchableOpacity>
          <Text style={styles.buttonText}>Mood</Text>
        </View>
      </View>

      {/* Add the lost dog button in a separate section below the profile details */}
      {currentAnimal && (
        <TouchableOpacity 
          style={[
            styles.lostDogActionButton,
            isLost ? styles.lostDogButton : styles.foundDogButton,
            isUpdatingLostStatus && styles.updatingButton
          ]} 
          onPress={toggleLostStatus}
          disabled={isUpdatingLostStatus}>
          <MaterialCommunityIcons 
            name={isLost ? "dog-service" : "dog"} 
            size={20} 
            color={isLost ? "#f44336" : "#4CAF50"} 
            style={{marginRight: 8}}
          />
          <Text style={[
            styles.lostDogButtonText,
            {color: isLost ? "#f44336" : "#4CAF50"}
          ]}>
            {isUpdatingLostStatus ? 'Updating...' : isLost ? 'Mark as Found' : 'Report as Lost'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Profile Details */}
      {currentAnimal && (
        <View style={styles.profileDetails}>
          {["name", "breed", "age", "gender", "height", "weight"].map((field) => (
            <View style={styles.row} key={field}>
              <Text style={styles.label}>{field.charAt(0).toUpperCase() + field.slice(1)}</Text>
              <Text style={styles.value}>{currentAnimal[field] || 'N/A'}</Text>
            </View>
          ))}
          <View style={styles.row}>
            <Text style={styles.label}>Temperament</Text>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={[styles.temperamentIndicator, 
                currentAnimal.temperament === 'aggressive' ? styles.aggressiveIndicator : 
                currentAnimal.temperament === 'friendly' ? styles.friendlyIndicator : 
                styles.neutralIndicator]} />
              <Text style={[
                styles.value,
                currentAnimal.temperament === 'aggressive' ? { color: colors.aggressive } :
                currentAnimal.temperament === 'friendly' ? { color: colors.friendly } :
                {}
              ]}>
                {currentAnimal.temperament ? 
                  currentAnimal.temperament.charAt(0).toUpperCase() + currentAnimal.temperament.slice(1) : 
                  'Neutral'}
              </Text>
            </View>
          </View>
        </View>
      )}
    
      {/* Temperament Modal with improved UI */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={temperamentModalVisible}
        onRequestClose={() => setTemperamentModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Dog Temperament</Text>
              <TouchableOpacity onPress={() => setTemperamentModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.yellow} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.temperamentLabel}>Select your dog's temperament:</Text>
            
            <View style={styles.temperamentOptionsContainer}>
              <TouchableOpacity 
                style={[styles.temperamentOption, 
                  selectedTemperament === 'aggressive' && styles.selectedTemperament,
                  selectedTemperament === 'aggressive' && styles.selectedAggressiveOption
                ]} 
                onPress={() => setSelectedTemperament('aggressive')}
              >
                <MaterialCommunityIcons 
                  name="dog-side" 
                  size={30} 
                  color={selectedTemperament === 'aggressive' ? colors.white : colors.aggressive} 
                />
                <Text style={[styles.temperamentText, selectedTemperament === 'aggressive' && styles.selectedTemperamentText]}>
                  Aggressive
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.temperamentOption, 
                  selectedTemperament === 'neutral' && styles.selectedTemperament
                ]} 
                onPress={() => setSelectedTemperament('neutral')}
              >
                <MaterialCommunityIcons 
                  name="dog-side" 
                  size={30} 
                  color={selectedTemperament === 'neutral' ? colors.white : colors.neutral} 
                />
                <Text style={[styles.temperamentText, selectedTemperament === 'neutral' && styles.selectedTemperamentText]}>
                  Neutral
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.temperamentOption, 
                  selectedTemperament === 'friendly' && styles.selectedTemperament,
                  selectedTemperament === 'friendly' && styles.selectedFriendlyOption
                ]} 
                onPress={() => setSelectedTemperament('friendly')}
              >
                <MaterialCommunityIcons 
                  name="dog" 
                  size={30} 
                  color={selectedTemperament === 'friendly' ? colors.white : colors.friendly} 
                />
                <Text style={[styles.temperamentText, selectedTemperament === 'friendly' && styles.selectedTemperamentText]}>
                  Friendly
                </Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.saveButton,
                selectedTemperament === 'aggressive' ? styles.aggressiveSaveButton :
                selectedTemperament === 'friendly' ? styles.friendlySaveButton :
                styles.saveButton
              ]} 
              onPress={() => updateTemperament(selectedTemperament)}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>

            {/* Add this inside the temperament modal, before the closing View */}
            {temperamentUpdateStatus && (
              <View style={[
                styles.statusMessage, 
                { backgroundColor: temperamentUpdateStatus.type === 'success' ? '#4CAF50' : '#F44336' }
              ]}>
                <Text style={styles.statusMessageText}>{temperamentUpdateStatus.message}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal */}
      {/* tracker */}
      <Modal visible={trackerModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalBackground}
        >
          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Register Tracker</Text>
              <TextInput
                style={styles.input}
                placeholder="Tracker ID"
                value={trackerId}
                onChangeText={setTrackerId}
              />
              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={styles.modalButton} onPress={handleRegisterTracker}>
                  <Text style={styles.modalButtonText}>Next</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => setTrackerModalVisible(false)}>
                  <Text style={styles.modalButtonText1}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      {/* Add */}
      <Modal visible={dogProfileModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalBackground}
        >
          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Add Dog Profile</Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                value={newProfile.name}
                onChangeText={(text) => setNewProfile({ ...newProfile, name: text })}
              />
              <View style={styles.inputContainer}>
                <Picker
                  selectedValue={newProfile.breed}
                  onValueChange={(itemValue) => setNewProfile({ ...newProfile, breed: itemValue })}
                  style={styles.input}
                >
                    <Picker.Item label="Labrador Retriever" value="Labrador Retriever" style={styles.pickerItem} />
                    <Picker.Item label="German Shepherd" value="German Shepherd" style={styles.pickerItem} />
                    <Picker.Item label="Golden Retriever" value="Golden Retriever" style={styles.pickerItem} />
                    <Picker.Item label="Bulldog" value="Bulldog" style={styles.pickerItem} />
                    <Picker.Item label="Beagle" value="Beagle" style={styles.pickerItem} />
                    <Picker.Item label="Poodle" value="Poodle" style={styles.pickerItem} />
                    <Picker.Item label="Rottweiler" value="Rottweiler" style={styles.pickerItem} />
                    <Picker.Item label="Yorkshire Terrier" value="Yorkshire Terrier" style={styles.pickerItem} />
                    <Picker.Item label="Boxer" value="Boxer" style={styles.pickerItem} />
                    <Picker.Item label="Dachshund" value="Dachshund" style={styles.pickerItem} />
                    <Picker.Item label="Siberian Husky" value="Siberian Husky" style={styles.pickerItem} />
                    <Picker.Item label="Great Dane" value="Great Dane" style={styles.pickerItem} />
                    <Picker.Item label="Doberman Pinscher" value="Doberman Pinscher" style={styles.pickerItem} />
                    <Picker.Item label="Shih Tzu" value="Shih Tzu" style={styles.pickerItem} />
                    <Picker.Item label="Cocker Spaniel" value="Cocker Spaniel" style={styles.pickerItem} />
                    <Picker.Item label="Pug" value="Pug" style={styles.pickerItem} />
                    <Picker.Item label="Chihuahua" value="Chihuahua" style={styles.pickerItem} />
                    <Picker.Item label="Australian Shepherd" value="Australian Shepherd" style={styles.pickerItem} />
                    <Picker.Item label="Border Collie" value="Border Collie" style={styles.pickerItem} />
                    <Picker.Item label="French Bulldog" value="French Bulldog" style={styles.pickerItem} />
                    <Picker.Item label="Boston Terrier" value="Boston Terrier" style={styles.pickerItem} />
                    <Picker.Item label="Bichon Frise" value="Bichon Frise" style={styles.pickerItem} />
                    <Picker.Item label="Akita" value="Akita" style={styles.pickerItem} />
                    <Picker.Item label="Maltese" value="Maltese" style={styles.pickerItem} />
                    <Picker.Item label="Saint Bernard" value="Saint Bernard" style={styles.pickerItem} />
                    <Picker.Item label="Weimaraner" value="Weimaraner" style={styles.pickerItem} />
                    <Picker.Item label="Newfoundland" value="Newfoundland" style={styles.pickerItem} />
                    <Picker.Item label="Cavalier King Charles Spaniel" value="Cavalier King Charles Spaniel" style={styles.pickerItem} />
                    <Picker.Item label="Alaskan Malamute" value="Alaskan Malamute" style={styles.pickerItem} />
                    <Picker.Item label="Papillon" value="Papillon" style={styles.pickerItem} />
                    <Picker.Item label="Shar Pei" value="Shar Pei" style={styles.pickerItem} />
                    <Picker.Item label="Shiba Inu" value="Shiba Inu" style={styles.pickerItem} />
                    <Picker.Item label="Basenji" value="Basenji" style={styles.pickerItem} />
                    <Picker.Item label="Whippet" value="Whippet" style={styles.pickerItem} />
                    <Picker.Item label="Airedale Terrier" value="Airedale Terrier" style={styles.pickerItem} />
                    <Picker.Item label="Scottish Terrier" value="Scottish Terrier" style={styles.pickerItem} />
                    <Picker.Item label="Samoyed" value="Samoyed" style={styles.pickerItem} />
                    <Picker.Item label="Pekingese" value="Pekingese" style={styles.pickerItem} />
                    <Picker.Item label="Lhasa Apso" value="Lhasa Apso" style={styles.pickerItem} />
                    <Picker.Item label="Chow Chow" value="Chow Chow" style={styles.pickerItem} />
                    <Picker.Item label="Havanese" value="Havanese" style={styles.pickerItem} />
                    <Picker.Item label="Belgian Malinois" value="Belgian Malinois" style={styles.pickerItem} />
                    <Picker.Item label="Rhodesian Ridgeback" value="Rhodesian Ridgeback" style={styles.pickerItem} />
                    <Picker.Item label="Bernese Mountain Dog" value="Bernese Mountain Dog" style={styles.pickerItem} />

                </Picker>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Age"
                value={newProfile.age}
                onChangeText={(text) => setNewProfile({ ...newProfile, age: text })}
              />
              <View style={styles.inputContainer}>
                <Picker
                  selectedValue={newProfile.gender}
                  onValueChange={(itemValue) => setNewProfile({ ...newProfile, gender: itemValue })}
                  style={styles.input}
                >
                  <Picker.Item label="Select Gender" value="" style={styles.pickerItem} />
                  <Picker.Item label="Male" value="Male" style={styles.pickerItem} />
                  <Picker.Item label="Female" value="Female" style={styles.pickerItem} />
                </Picker>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Height"
                value={newProfile.height}
                onChangeText={(text) => setNewProfile({ ...newProfile, height: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Weight"
                value={newProfile.weight}
                onChangeText={(text) => setNewProfile({ ...newProfile, weight: text })}
              />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={styles.modalButton} onPress={handleSaveDogProfile}>
                  <Text style={styles.modalButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => setDogProfileModalVisible(false)}>
                  <Text style={styles.modalButtonText1}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      {/* Edit */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalBackground}
        >
          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Edit Dog Profile</Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                value={newProfile.name}
                onChangeText={(text) => setNewProfile({ ...newProfile, name: text })}
              />
              <View style={styles.inputContainer}>
                <Picker
                  selectedValue={newProfile.breed}
                  onValueChange={(itemValue) => setNewProfile({ ...newProfile, breed: itemValue })}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Breed" value="" style={styles.pickerItem} />
                  <Picker.Item label="Labrador Retriever" value="Labrador Retriever" style={styles.pickerItem} />
                  <Picker.Item label="German Shepherd" value="German Shepherd" style={styles.pickerItem} />
                  <Picker.Item label="Golden Retriever" value="Golden Retriever" style={styles.pickerItem} />
                  <Picker.Item label="Bulldog" value="Bulldog" style={styles.pickerItem} />
                  <Picker.Item label="Beagle" value="Beagle" style={styles.pickerItem} />
                </Picker>

              </View>
              <TextInput
                style={styles.input}
                placeholder="Age"
                value={newProfile.age}
                onChangeText={(text) => setNewProfile({ ...newProfile, age: text })}
              />
              <View style={styles.inputContainer}>
                <Picker
                  selectedValue={newProfile.gender}
                  onValueChange={(itemValue) => setNewProfile({ ...newProfile, gender: itemValue })}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Gender" value="" style={styles.pickerItem}/>
                  <Picker.Item label="Male" value="Male" style={styles.pickerItem}/>
                  <Picker.Item label="Female" value="Female" style={styles.pickerItem}/>
                </Picker>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Height"
                value={newProfile.height}
                onChangeText={(text) => setNewProfile({ ...newProfile, height: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Weight"
                value={newProfile.weight}
                onChangeText={(text) => setNewProfile({ ...newProfile, weight: text })}
              />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={styles.modalButton} onPress={handleSaveEdit}>
                  <Text style={styles.modalButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalButtonText1}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={confirmDelete}
        animationType="fade"
        transparent={true}
        onRequestClose={handleDeleteCancel}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Are you sure you want to delete this animal?</Text>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalButton} onPress={handleDelete}>
                <Text style={styles.modalButtonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={handleDeleteCancel}
              >
                <Text style={styles.modalButtonText1}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: width * 0.04,
    paddingTop: Platform.OS === 'ios' ? height * 0.08 : height * 0.06,
    backgroundColor: colors.white,
  },
  scrollViewContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: height * 0.02,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    position: 'relative',
    paddingHorizontal: width * 0.05,
    alignItems: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    width: width * 0.25,
    height: width * 0.25,
    borderRadius: width * 0.125,
    backgroundColor: colors.black,
  },
  profileImage: {
    width: '50%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: normalize(24),
    fontWeight: '600',
    marginTop: height * 0.01,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.05,
    marginVertical: height * 0.01,
  },
  button: {
    backgroundColor: colors.yellow,
    padding: width * 0.025,
    borderRadius: width * 0.125,
    width: width * 0.15,
    height: width * 0.15,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: colors.black,
    borderWidth: 1,
  },
  buttonColumn: {
    alignItems: 'center',
  },
  buttonText: {
    color: colors.black,
    marginTop: height * 0.01,
    fontWeight: '600',
    textAlign: 'center',
  },
  profileDetails: {
    backgroundColor: colors.yellow,
    borderRadius: width * 0.025,
    padding: width * 0.04,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: height * 0.01,
    borderColor: colors.grey,
    borderBottomWidth: 1,
  },
  label: {
    fontWeight: '600',
  },
  value: {
    color: colors.white,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContainer: {
    backgroundColor: colors.white,
    width: '100%',
    maxWidth: width * 0.6,
    padding: width * 0.06,
    borderRadius: width * 0.03,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: normalize(17),
    fontWeight: 'bold',
    textAlign: 'center',
    paddingBottom: height * 0.02,
    marginTop: height * 0.01,
  },
  input: {
    height: height * 0.06,
    borderColor: colors.grey,
    borderWidth: 1,
    borderRadius: width * 0.01,
    paddingLeft: width * 0.025,
    paddingRight: width * 0.025,
    width: width * 0.5,
    fontSize: normalize(14),
    marginBottom: height * 0.02,
  },
  picker: {
    height: height * 0.06,
    fontSize: normalize(14),
    width: width * 0.5,
    color: colors.black,
  },
  inputContainer: {
    marginBottom: height * 0.015,
    borderColor: colors.grey,
    borderWidth: 1,
    borderRadius: width * 0.01,
  },
  pickerItem: {
    fontSize: normalize(12),
    color: colors.grey,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: height * 0.025,
  },
  modalButton: {
    flex: 1,
    backgroundColor: colors.yellow,
    padding: height * 0.015,
    borderRadius: width * 0.025,
    marginHorizontal: width * 0.01,
    alignItems: 'center',
    borderColor: colors.black,
    borderWidth: 1,
  },
  modalCancelButton: {
    borderColor: colors.yellow,
    borderWidth: 1,
    backgroundColor: colors.black,
  },
  modalButtonText: {
    color: colors.black,
    fontWeight: '600',
    fontSize: normalize(16),
    marginBottom: height * 0.005,
  },
  modalButtonText1: {
    color: colors.white,
    fontWeight: '600',
    fontSize: normalize(16),
    marginBottom: height * 0.005,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  temperamentIndicator: {
    width: width * 0.04,
    height: width * 0.04,
    borderRadius: width * 0.02,
    marginRight: width * 0.01,
  },
  aggressiveIndicator: {
    backgroundColor: '#FF5252',
  },
  friendlyIndicator: {
    backgroundColor: '#4CAF50',
  },
  neutralIndicator: {
    backgroundColor: colors.yellow,
  },
  temperamentOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: height * 0.01,
    flexWrap: 'nowrap',
    gap: width * 0.005,
    width: '100%',
  },
  temperamentOption: {
    alignItems: 'center',
    padding: width * 0.015,
    borderRadius: width * 0.025,
    borderWidth: 2,
    borderColor: '#eee',
    backgroundColor: '#f9f9f9',
    width: '32%',
    minWidth: width * 0.15,
    marginBottom: height * 0.01,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  temperamentText: {
    marginTop: height * 0.01,
    fontWeight: '600',
    color: '#333',
    fontSize: normalize(8),
    textAlign: 'center',
  },
  selectedTemperamentText: {
    color: colors.white,
    fontSize: normalize(8),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  selectedTemperament: {
    backgroundColor: colors.yellow,
    borderColor: colors.yellow,
  },
  temperamentLabel: {
    fontSize: normalize(15),
    fontWeight: '600',
    marginVertical: height * 0.015,
    color: colors.black,
  },
  modalContent: {
    backgroundColor: colors.white,
    padding: width * 0.05,
    borderRadius: width * 0.025,
    width: '90%',
    maxWidth: width * 0.8,
    alignSelf: 'center',
  },
  saveButton: {
    backgroundColor: colors.yellow,
    padding: height * 0.017,
    borderRadius: width * 0.025,
    alignItems: 'center',
    marginTop: height * 0.012,
  },
  saveButtonText: {
    color: colors.black,
    fontWeight: '600',
    fontSize: normalize(16),
  },
  temperamentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: height * 0.008,
    paddingHorizontal: width * 0.03,
    borderRadius: width * 0.04,
    marginTop: height * 0.008,
  },
  temperamentBadgeText: {
    fontSize: normalize(14),
    fontWeight: 'bold',
    marginLeft: width * 0.015,
  },
  aggressiveButton: {
    backgroundColor: colors.aggressive,
    borderColor: colors.aggressiveBorder,
  },
  friendlyButton: {
    backgroundColor: colors.friendly,
    borderColor: colors.friendlyBorder,
  },
  neutralButton: {
    backgroundColor: colors.neutral,
    borderColor: colors.neutralBorder,
  },
  aggressiveSaveButton: {
    backgroundColor: colors.aggressive,
    borderColor: colors.aggressiveBorder,
  },
  friendlySaveButton: {
    backgroundColor: colors.friendly,
    borderColor: colors.friendlyBorder,
  },
  selectedAggressiveOption: {
    backgroundColor: colors.aggressive,
    borderColor: colors.aggressiveBorder,
  },
  selectedFriendlyOption: {
    backgroundColor: colors.friendly,
    borderColor: colors.friendlyBorder,
  },
  recentlyChangedTemperament: {
    borderWidth: 2,
    borderColor: '#FFC107',
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 8,
  },
  statusMessage: {
    padding: width * 0.025,
    borderRadius: width * 0.01,
    marginTop: height * 0.012,
    alignItems: 'center',
  },
  statusMessageText: {
    color: 'white',
    fontWeight: 'bold',
  },
  lostDogControlButton: {
    position: 'absolute',
    right: width * 0.05,
    bottom: height * 0.12,
    width: width * 0.12,
    height: width * 0.12,
    borderRadius: width * 0.06,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 999,
  },
  lostActiveButton: {
    backgroundColor: '#ff3131',
  },
  lostControlsPanel: {
    position: 'absolute',
    right: width * 0.05,
    bottom: height * 0.2,
    width: width * 0.6,
    backgroundColor: 'white',
    borderRadius: width * 0.02,
    padding: width * 0.04,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 998,
  },
  lostControlsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: height * 0.02,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: height * 0.01,
  },
  lostControlsTitle: {
    fontSize: normalize(16),
    fontWeight: 'bold',
    color: '#333',
  },
  lostControlsClose: {
    padding: width * 0.01,
  },
  lostStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: height * 0.02,
  },
  lostStatusLabel: {
    fontSize: normalize(14),
    color: '#333',
  },
  lostStatusIndicator: {
    alignItems: 'center',
    marginBottom: height * 0.02,
  },
  statusBadge: {
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.04,
    borderRadius: width * 0.04,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lostBadge: {
    backgroundColor: '#ff3131',
  },
  foundBadge: {
    backgroundColor: '#4CAF50',
  },
  statusBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: normalize(12),
  },
  aggressiveWarning: {
    flexDirection: 'row',
    backgroundColor: '#fff0f0',
    padding: width * 0.02,
    borderRadius: width * 0.02,
    alignItems: 'center',
    marginBottom: height * 0.01,
  },
  aggressiveWarningText: {
    color: '#d32f2f',
    fontSize: normalize(12),
    marginLeft: width * 0.01,
    flex: 1,
    flexWrap: 'wrap',
  },
  lostTimestamp: {
    alignItems: 'center',
  },
  lostTimestampText: {
    fontSize: normalize(12),
    color: '#666',
    fontStyle: 'italic',
  },
  lostDogButton: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
  },
  foundDogButton: {
    backgroundColor: '#e8f5e9',
    borderColor: '#c8e6c9',
  },
  updatingButton: {
    opacity: 0.7,
  },
  lostDogEmoji: {
    fontSize: normalize(18),
    color: colors.white,
  },
  lostDogActionButton: {
    backgroundColor: '#f8f8f8',
    padding: width * 0.03,
    borderRadius: width * 0.04,
    alignItems: 'center',
    marginVertical: height * 0.01,
    marginHorizontal: width * 0.08,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  lostDogButtonText: {
    fontWeight: 'bold',
    fontSize: normalize(14),
    textAlign: 'center',
  },
});

export default DogProfile;