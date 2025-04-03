import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Modal, View, Text, Image, StyleSheet, TouchableOpacity, Pressable, ActivityIndicator, Alert, ScrollView, Animated, FlatList } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import DogImage from '../../../assets/images/dog_pics.png';
import Hybrid from '../../../assets/images/Hybrid.png';
import Standard from '../../../assets/images/Standard.png';
import Satellite from '../../../assets/images/Satellite.png';
import colors from '../../constants/colors';
import environments from '../../constants/enviroments';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Notifications from 'expo-notifications';
import Ionicons from '@expo/vector-icons/Ionicons';

const DogWalkingApp = () => {
  const navigation = useNavigation();
  const [mapType, setMapType] = useState('standard');
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const [viewAll, setViewAll] = useState(false);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapSettingsVisible, setMapSettingsVisible] = useState(false);
  const [territories, setTerritories] = useState([]);
  const [safeZoneStatuses, setSafeZoneStatuses] = useState({});
  const [unsafeAnimals, setUnsafeAnimals] = useState([]);
  const [showLostAggressive, setShowLostAggressive] = useState(false);
  const [lostAggressiveDogs, setLostAggressiveDogs] = useState([]);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [trackingInterval, setTrackingInterval] = useState(null);
  const [mapRef, setMapRef] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true); // Default to enabled for safety
  const [nearbyAlertThreshold, setNearbyAlertThreshold] = useState(500); // meters
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showDetailedInfo, setShowDetailedInfo] = useState(false);
  const [selectedLostDog, setSelectedLostDog] = useState(null);
  const [showLostAggressiveInfo, setShowLostAggressiveInfo] = useState(false);
  const [proximityInterval, setProximityInterval] = useState(null);
  const [hasAggressive, setHasAggressive] = useState(false);
  const [aggressiveDogsExist, setAggressiveDogsExist] = useState(false);
  const [isRefreshingLostDogs, setIsRefreshingLostDogs] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [dangerZones, setDangerZones] = useState([]);
  const [inDangerZone, setInDangerZone] = useState({});
  const [forceUpdate, setForceUpdate] = useState(false);

  const currentBatteryLevel = currentLocation?.battery || 'N/A';
  const currentConnectionStatus = currentLocation?.status || 'Offline';

  const getToken = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return token;
    } catch (error) {
      console.error('Error retrieving token:', error);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        await fetchDeviceData();
        
        // Check for temperament updates each time we fetch locations
        if (isMounted) {
          await checkForTemperamentChanges();
        }
      } catch (error) {
        console.error('Error in data refresh cycle:', error);
      }
    };
    
    fetchData();
    // Reduced frequency to improve performance
    const intervalId = setInterval(fetchData, 5000); // Changed from 2s to 5s
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    loadTerritories();
    
    // Set up interval to reload territories less frequently
    const territoriesInterval = setInterval(() => {
      loadTerritories();
    }, 15000); // Changed from 5s to 15s for better performance
    
    return () => clearInterval(territoriesInterval);
  }, []);

  useEffect(() => {
    if (locations.length > 0 && territories.length > 0) {
      checkSafeZones();
    }
    
    if (locations.length > 0 && dangerZones.length > 0) {
      checkDangerZones(); // Add this line
    }
    
    // Reduced frequency of checks for better performance
    const intervalId = setInterval(() => {
      if (locations.length > 0 && territories.length > 0) {
        checkSafeZones();
      }
    }, 3000); // Changed from 1s to 3s
    
    return () => clearInterval(intervalId);
  }, [locations, territories, dangerZones]); // Add dangerZones dependency

  useEffect(() => {
    // Setup listener for temperament changes from AsyncStorage
    const checkForTemperamentUpdates = async () => {
      try {
        const storedUpdatesString = await AsyncStorage.getItem('temperamentChanges');
        if (storedUpdatesString) {
          const changes = JSON.parse(storedUpdatesString);
          
          // Apply any temperament changes to the current locations
          const updatedLocations = locations.map(location => {
            const change = changes.find(c => c.animalId === location.id);
            if (change) {
              return {
                ...location,
                temperament: change.temperament
              };
            }
            return location;
          });
          
          // Update locations state if changes were found
          if (JSON.stringify(updatedLocations) !== JSON.stringify(locations)) {
            setLocations(updatedLocations);
            // Clear the changes after applying
            await AsyncStorage.setItem('temperamentChanges', JSON.stringify([]));
          }
        }
      } catch (error) {
        console.error('Error checking temperament updates:', error);
      }
    };
    
    // Check immediately and then periodically
    checkForTemperamentUpdates();
    // Check for temperament changes less frequently
    const intervalId = setInterval(checkForTemperamentUpdates, 2000); // Changed from 500ms to 2s
    
    return () => clearInterval(intervalId);
  }, [locations]);

  const fetchDeviceData = async () => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No token found');
      }

      // First try to get animal data to get temperament information
      const animalsResponse = await fetch(`${environments.API_BASE_URL}/api/animals`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let animalTemperaments = {};
      let animalMap = {}; // Map to store the relationship between device and animal
      
      if (animalsResponse.ok) {
        const animalsData = await animalsResponse.json();
        console.log("Fetched animals:", animalsData.length);
        
        // Create maps for animal data
        animalsData.forEach(animal => {
          if (animal._id) {
            // Store temperament by animal ID
            animalTemperaments[animal._id] = animal.temperament || 'neutral';
            
            // If animal has a device, map device ID to animal ID
            if (animal.device && animal.device._id) {
              animalMap[animal.device._id] = animal._id;
            }
          }
        });
      }

      const response = await fetch(`${environments.API_BASE_URL}/api/deviceData`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched device data:", data.length);

      if (data.length === 0) {
        setLocations([{
          id: '0',
          latitude: 54.6892,
          longitude: 25.2798,
          animalName: 'No animals found',
          battery: 'N/A',
          status: 'Offline',
          object_id: 'none',
          isOffline: true,
          temperament: 'neutral',
          animalId: '0' // Add animalId property
        }]);
        setLoading(false);
        return;
      }

      const formattedLocations = data.map(device => {
        // Always use animal name if available, fallback to device name
        const animalName = device.animalName && device.animalName !== 'Device is offline' && device.animalName !== 'Unknown Animal'
          ? device.animalName 
          : device.deviceName || 'Unknown Animal';
        
        // Determine if device is offline
        const isOffline = !device.gnssStatus;
        
        // Get the linked animal ID for this device
        const linkedAnimalId = animalMap[device._id] || device.animal || null;
        
        // Try to get temperament from our map, fallback to what's in device or default to neutral
        const temperament = linkedAnimalId && animalTemperaments[linkedAnimalId] 
          ? animalTemperaments[linkedAnimalId] 
          : device.temperament || 'neutral';
        
        return {
          id: device._id,
          latitude: device.positionLatitude,
          longitude: device.positionLongitude,
          animalName: animalName,
          battery: device.batteryLevel || 'N/A',
          status: isOffline ? 'Offline' : 'Online',
          object_id: device.object_id || 'none',
          isOffline: isOffline,
          temperament: temperament,
          animalId: linkedAnimalId // Store the actual animal ID for direct matching
        };
      });

      // Filter out duplicate locations
      const uniqueLocations = [];
      formattedLocations.forEach(device => {
        const existingDevice = uniqueLocations.find(
          location =>
            location.latitude === device.latitude && location.longitude === device.longitude && 
            location.object_id === device.object_id
        );
        if (!existingDevice) {
          uniqueLocations.push(device);
        }
      });

      // Check if the locations have actually changed before updating state
      if (JSON.stringify(uniqueLocations) !== JSON.stringify(locations)) {
        console.log("Updating locations with new device data");
        setLocations(uniqueLocations);

        if (uniqueLocations.length > 0) {
          // Keep current index if possible, otherwise reset to 0
          if (currentLocationIndex >= uniqueLocations.length) {
            setCurrentLocationIndex(0);
          }
        } else {
          setLocations([{
            id: '0',
            latitude: 54.6892,
            longitude: 25.2798,
            animalName: 'No animals found',
            battery: 'N/A',
            status: 'Offline',
            object_id: 'none',
            isOffline: true,
            temperament: 'neutral',
            animalId: '0' // Add animalId property
          }]);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching device data:', error);
      setLoading(false);
      setLocations([{
        id: '0',
        latitude: 54.6892,
        longitude: 25.2798,
        animalName: 'No animals found',
        battery: 'N/A',
        status: 'Offline',
        object_id: 'none',
        isOffline: true,
        temperament: 'neutral',
        animalId: '0' // Add animalId property
      }]);
    }
  };

  const loadTerritories = async () => {
    try {
      // First try to load from local storage for instant display
      const storedTerritories = await AsyncStorage.getItem('territories');
      if (storedTerritories) {
        const parsedTerritories = JSON.parse(storedTerritories);
        setTerritories(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(parsedTerritories)) {
            return parsedTerritories;
          }
          return prev;
        });
      }
      
      // Then try to fetch from API
      const token = await getToken();
      if (!token) return;
      
      try {
        const response = await fetch(`${environments.API_BASE_URL}/api/territories`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const apiTerritories = await response.json();
          
          // Only update if there are actual changes
          setTerritories(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(apiTerritories)) {
              // Save to AsyncStorage for offline use
              AsyncStorage.setItem('territories', JSON.stringify(apiTerritories))
                .catch(err => console.error('Error saving territories to storage:', err));
              return apiTerritories;
            }
            return prev;
          });
        } else {
          console.log('Error loading territories:', response.status);
          
          // Try fallback API endpoint
          const fallbackUrl = `${environments.FALLBACK_API_BASE_URL}/api/territories`;
          console.log('Trying fallback API for /api/territories');
          
          const fallbackResponse = await fetch(fallbackUrl, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (fallbackResponse.ok) {
            const fallbackTerritories = await fallbackResponse.json();
            setTerritories(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(fallbackTerritories)) {
                // Save to AsyncStorage for offline use
                AsyncStorage.setItem('territories', JSON.stringify(fallbackTerritories))
                  .catch(err => console.error('Error saving territories to storage:', err));
                return fallbackTerritories;
              }
              return prev;
            });
          } else {
            console.error('Both API endpoints failed:', fallbackResponse.status);
          }
        }
      } catch (error) {
        console.error('Error fetching territories:', error);
        console.log('⚠️ API failed, loading territories from local storage');
      }
    } catch (error) {
      console.error('Error loading territories:', error);
    }
  };

  const loadDangerZones = async () => {
    try {
      console.log('⚠️ Loading danger zones...');
      
      // Check if danger zones have been updated in DangerZone.js
      const dangerzoneUpdated = await AsyncStorage.getItem('dangerZonesUpdated');
      if (dangerzoneUpdated === 'true') {
        console.log('⚠️ Danger zones updated flag detected');
        
        // Clear the flag
        await AsyncStorage.setItem('dangerZonesUpdated', 'false');
        
        // Get the updated zones from storage
        const savedDangerZones = await AsyncStorage.getItem('dangerZones');
        if (savedDangerZones) {
          const parsedDangerZones = JSON.parse(savedDangerZones);
          console.log('⚠️ Loaded updated danger zones from storage:', parsedDangerZones.length);
          setDangerZones(parsedDangerZones);
          
          // Force check danger zones immediately
          setTimeout(() => checkDangerZones(), 500);
          return;
        }
      }
      
      // Normal loading flow - first load from AsyncStorage for immediate display
      try {
        const savedDangerZones = await AsyncStorage.getItem('dangerZones');
        if (savedDangerZones) {
          const parsedDangerZones = JSON.parse(savedDangerZones);
          console.log('📱 Loaded danger zones from AsyncStorage:', parsedDangerZones.length);
          
          if (parsedDangerZones.length > 0) {
            setDangerZones(parsedDangerZones);
            // Immediately check if any animals are in danger zones
            setTimeout(() => checkDangerZones(), 500);
          }
        }
      } catch (err) {
        console.error('Error loading danger zones from storage:', err);
      }
      
      const token = await getToken();
      if (!token) return;
      
      try {
        const response = await fetch(`${environments.API_BASE_URL}/api/danger-zones`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const apiDangerZones = await response.json();
          console.log('⚠️ Fetched danger zones from API:', apiDangerZones.length);
          
          // Only update if there are actual changes
          setDangerZones(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(apiDangerZones)) {
              // Save to AsyncStorage for offline use
              AsyncStorage.setItem('dangerZones', JSON.stringify(apiDangerZones))
                .catch(err => console.error('Error saving danger zones to storage:', err));
              
              // Check danger zones again with new data
              setTimeout(() => checkDangerZones(), 500);
              
              return apiDangerZones;
            }
            return prev;
          });
        } else {
          console.log('Error loading danger zones:', response.status);
          
          // Try fallback API endpoint
          const fallbackUrl = `${environments.FALLBACK_API_BASE_URL}/api/danger-zones`;
          console.log('Trying fallback API for /api/danger-zones');
          
          const fallbackResponse = await fetch(fallbackUrl, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (fallbackResponse.ok) {
            const fallbackDangerZones = await fallbackResponse.json();
            console.log('⚠️ Fetched danger zones from fallback API:', fallbackDangerZones.length);
            
            setDangerZones(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(fallbackDangerZones)) {
                // Save to AsyncStorage for offline use
                AsyncStorage.setItem('dangerZones', JSON.stringify(fallbackDangerZones))
                  .catch(err => console.error('Error saving danger zones to storage:', err));
                
                // Check danger zones again with new data
                setTimeout(() => checkDangerZones(), 500);
                
                return fallbackDangerZones;
              }
              return prev;
            });
          } else {
            console.error('Both API endpoints failed:', fallbackResponse.status);
          }
        }
      } catch (error) {
        console.error('Error fetching danger zones:', error);
        console.log('⚠️ API failed, loading danger zones from local storage');
      }
    } catch (error) {
      console.error('Error loading danger zones:', error);
    }
  };

  const isPointInPolygon = (point, polygon) => {
    if (!point || !polygon || polygon.length < 3) return false;
    
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].latitude;
      const yi = polygon[i].longitude;
      const xj = polygon[j].latitude;
      const yj = polygon[j].longitude;
      
      const intersect = ((yi > point.longitude) !== (yj > point.longitude))
        && (point.latitude < (xj - xi) * (point.longitude - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  };

  const checkSafeZones = () => {
    if (!locations || locations.length === 0 || !territories || territories.length === 0) {
      return;
    }
    
    const newStatuses = {};
    const newUnsafeAnimals = [];
    
    // Check each animal location against all territories
    locations.forEach(location => {
      if (!location || location.id === '0' || !location.latitude || !location.longitude) return;
      
      let isInSafeZone = false;
      let hasSafeZone = false;
      
      // Faster matching by animalId when possible
      const animalTerritories = territories.filter(t => t.animal === location.id || true);
      
      if (animalTerritories.length > 0) {
        hasSafeZone = true;
        
        // Check if the animal is in any of its territories
        for (const territory of animalTerritories) {
          if (territory.coordinates && territory.coordinates.length >= 3) {
            if (isPointInPolygon({
              latitude: location.latitude,
              longitude: location.longitude
            }, territory.coordinates)) {
              isInSafeZone = true;
              break;
            }
          }
        }
      }
      
      // Update the status for this animal
      newStatuses[location.id] = {
        inSafeZone: isInSafeZone,
        hasSafeZone: hasSafeZone
      };
      
      // Add to unsafe list if the animal has a safe zone but is not in it
      if (hasSafeZone && !isInSafeZone) {
        newUnsafeAnimals.push(location.id);
      }
    });
    
    // Use functional updates to avoid race conditions
    setSafeZoneStatuses(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(newStatuses)) {
        return newStatuses;
      }
      return prev;
    });
    
    setUnsafeAnimals(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(newUnsafeAnimals)) {
        return newUnsafeAnimals;
      }
      return prev;
    });
  };

  const checkDangerZones = () => {
    if (!locations || locations.length === 0 || !dangerZones || dangerZones.length === 0) {
      console.log('No locations or danger zones to check');
      return;
    }
    
    console.log(`Checking ${locations.length} animals against ${dangerZones.length} danger zones`);
    
    // Debug danger zones
    dangerZones.forEach((zone, index) => {
      console.log(`Danger zone ${index+1}: type=${zone.dangerType}, animal=${typeof zone.animal === 'object' ? zone.animal?._id : zone.animal}, coordinates=${zone.coordinates?.length || 0} points`);
    });
    
    const newStatuses = {};
    const animalsInDanger = [];
    
    // Check each animal location against all danger zones
    locations.forEach(location => {
      if (!location || location.id === '0' || !location.latitude || !location.longitude) return;
      
      console.log(`Checking animal ${location.animalName} (ID: ${location.id}) at position: lat=${location.latitude}, lng=${location.longitude}`);
      
      let isInDangerZone = false;
      let currentDangerZone = null;
      let dangerType = null;
      
      // Check if the animal is in any danger zone
      for (const zone of dangerZones) {
        if (zone.coordinates && zone.coordinates.length >= 3) {
          const isInside = isPointInPolygon({
            latitude: location.latitude,
            longitude: location.longitude
          }, zone.coordinates);
          
          if (isInside) {
            isInDangerZone = true;
            currentDangerZone = zone._id;
            dangerType = zone.dangerType;
            console.log(`🚨 Animal ${location.animalName} (ID: ${location.id}) is in a ${dangerType} danger zone!`);
            break;
          }
        }
      }
      
      // Update the status for this animal
      newStatuses[location.id] = {
        inDangerZone: isInDangerZone,
        dangerZone: currentDangerZone,
        dangerType: dangerType
      };
      
      // Add to danger list if the animal is in a danger zone
      if (isInDangerZone) {
        animalsInDanger.push(location.id);
      }
    });
    
    console.log('Updated danger zone statuses:', JSON.stringify(newStatuses, null, 2));
    
    // Update the state with new statuses
    setInDangerZone(newStatuses);
    
    // Force an update if the current animal is in a danger zone
    if (currentLocation && currentLocation.id !== '0') {
      const currentStatus = newStatuses[currentLocation.id];
      if (currentStatus && currentStatus.inDangerZone) {
        console.log(`Current animal ${currentLocation.animalName} is in a danger zone - forcing UI update`);
        setForceUpdate(prev => !prev); // Toggle a boolean to force component update
      }
    }
  };

  const changeMapType = (type) => {
    setMapType(type);
    setMapSettingsVisible(false);
  };

  const currentLocation = locations[currentLocationIndex] || {
    latitude: 54.6892,
    longitude: 25.2798,
    animalName: 'No animals found',
    battery: 'N/A',
    status: 'Offline',
    object_id: 'none',
    isOffline: true,
    temperament: 'neutral',
  };

  const toggleViewAll = () => {
    if (!viewAll) {
      // When switching to view all, set a significantly zoomed out region
      const region = getMapRegionForAllLocations(locations);
      if (mapRef) {
        mapRef.animateToRegion(region, 500);
      }
    } else {
      // When switching back to single view, focus on current animal
      if (locations.length > 0 && currentLocationIndex < locations.length) {
        const current = locations[currentLocationIndex];
        if (mapRef) {
          mapRef.animateToRegion({
            latitude: current.latitude,
            longitude: current.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 500);
        }
      }
    }
    setViewAll(!viewAll);
  };

  const goToPreviousAnimal = () => {
    if (currentLocationIndex > 0) {
      setCurrentLocationIndex(currentLocationIndex - 1);
    }
  };

  const goToNextAnimal = () => {
    if (currentLocationIndex < locations.length - 1) {
      setCurrentLocationIndex(currentLocationIndex + 1);
    }
  };

  // Fixed navigation function
  const navigateToDevicePage = (device) => {
    if (device && device.id !== '0') {
      // Check if the Device screen exists in the navigation stack
      try {
        // Use the correct screen name (likely "Device" instead of "DeviceDetails")
        navigation.navigate('Device', { deviceId: device.id });
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback to another screen if DeviceDetails doesn't exist
        try {
          navigation.navigate('Home');
        } catch (e) {
          console.error('Failed to navigate to fallback screen:', e);
        }
      }
    }
  };

  // Fix the function to check for temperament changes
  const checkForTemperamentChanges = async () => {
    try {
      const storedChangesString = await AsyncStorage.getItem('temperamentChanges');
      if (!storedChangesString) return;
      
      const storedChanges = JSON.parse(storedChangesString);
      if (storedChanges.length === 0) return;
      
      console.log("Found temperament changes in AsyncStorage:", storedChanges);
      
      // Get current locations
      const currentLocations = [...locations];
      let hasChanges = false;
      
      // Update locations with new temperament values
      const updatedLocations = currentLocations.map(location => {
        // Check for matches with both device ID and animal ID
        const matchingChange = storedChanges.find(change => 
          // Try to match with animalId directly if available
          (location.animalId && change.animalId === location.animalId) ||
          // Fall back to device ID match
          change.animalId === location.id
        );
        
        if (matchingChange && location.temperament !== matchingChange.temperament) {
          console.log(`Updating location ${location.id} (animal: ${location.animalId}) temperament to ${matchingChange.temperament}`);
          hasChanges = true;
          return {
            ...location,
            temperament: matchingChange.temperament,
            recentlyChanged: true
          };
        }
        return location;
      });
      
      // Only update state if there were actual changes
      if (hasChanges) {
        console.log("Updating locations with new temperament values");
        setLocations(updatedLocations);
        
        // Clear the changes after applying
        await AsyncStorage.setItem('temperamentChanges', JSON.stringify([]));
      }
    } catch (error) {
      console.error("Error checking temperament changes:", error);
    }
  };

  // Move the useEffect out of renderStatusBox to the main component level
  useEffect(() => {
    // Check for latest temperament when currentLocation changes
    if (currentLocation && currentLocation.id !== '0' && !viewAll) {
      const getLatestTemperament = async () => {
        try {
          const storedChangesString = await AsyncStorage.getItem('temperamentChanges');
          if (storedChangesString) {
            const storedChanges = JSON.parse(storedChangesString);
            
            // Check for matches with both deviceId and animalId
            const matchingChange = storedChanges.find(
              change => (
                // Try to match with animalId directly if available
                (currentLocation.animalId && change.animalId === currentLocation.animalId) ||
                // Fall back to device ID match
                change.animalId === currentLocation.id
              )
            );
              
            if (matchingChange && matchingChange.temperament !== currentLocation.temperament) {
              console.log(`Status box updating temperament for ${currentLocation.animalName} from ${currentLocation.temperament} to ${matchingChange.temperament}`);
              
              // If we have a newer temperament, update the location object
              const updatedLocations = locations.map(location => 
                (location.id === currentLocation.id || 
                 (location.animalId && location.animalId === matchingChange.animalId))
                  ? { ...location, temperament: matchingChange.temperament }
                  : location
              );
              
              setLocations(updatedLocations);
            }
          }
        } catch (error) {
          console.error("Error checking for latest temperament in status box:", error);
        }
      };
      
      getLatestTemperament();
    }
  }, [currentLocation, locations, viewAll]);

  // Completely refactored fetchLostDogs function for better lost dog tracking
  const fetchLostDogs = async () => {
    setIsRefreshingLostDogs(true);
    try {
      const token = await getToken();
      if (!token) {
        console.log('No token found for fetching lost dogs');
        setIsRefreshingLostDogs(false);
        return;
      }
      
      console.log('Fetching lost dogs...');
      
      // Skip the problematic endpoint that returns 500
      let data = null;
      
      // Go directly to the working endpoint
      try {
        console.log('Fetching from animals endpoint with isLost filter');
        const response = await fetch(`${environments.API_BASE_URL}/api/animals?isLost=true`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          data = await response.json();
          console.log(`Successfully fetched ${data.length} lost dogs`);
        } else {
          console.error(`Animals endpoint failed with status: ${response.status}`);
          
          // Try another approach to get lost animals
          console.log('Trying to fetch all animals and filter for lost ones');
          const allAnimalsResponse = await fetch(`${environments.API_BASE_URL}/api/animals`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (allAnimalsResponse.ok) {
            const allAnimals = await allAnimalsResponse.json();
            
            // Ensure we only get actually lost dogs
            data = allAnimals.filter(animal => animal.isLost === true);
            console.log(`Found ${data.length} lost dogs by filtering all animals`);
            
            // Debug output for each dog we found
            data.forEach((dog, index) => {
              console.log(`Lost dog ${index + 1}: ${dog.name}, isLost=${dog.isLost}, temperament=${dog.temperament}`);
            });
          } else {
            console.error(`All animals endpoint failed with status: ${allAnimalsResponse.status}`);
          }
        }
      } catch (error) {
        console.error('Error fetching lost dogs:', error);
      }
      
      // If we have data, process it
      if (data && data.length > 0) {
        // Only include actually lost dogs
        const trulyLostDogs = data.filter(dog => dog.isLost === true);
        console.log(`After filtering, there are ${trulyLostDogs.length} actually lost dogs`);
        
        // Cache the result for offline use
        await AsyncStorage.setItem('lastLostDogs', JSON.stringify(trulyLostDogs));
        
        setLostAggressiveDogs(trulyLostDogs);
        setLastRefreshTime(new Date());
      } else {
        console.log('No lost dogs found');
        setLostAggressiveDogs([]);
      }
    } catch (error) {
      console.error('Unexpected error in fetchLostDogs:', error);
    } finally {
      setIsRefreshingLostDogs(false);
    }
  };

  // Check if the current user has any aggressive dogs
  const checkUserHasAggressiveDogs = async () => {
    try {
      const token = await getToken();
      if (!token) return false;
      
      const response = await fetch(`${environments.API_BASE_URL}/api/animals`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const hasAggressiveDog = data.some(dog => dog.temperament === 'aggressive');
      setHasAggressive(hasAggressiveDog);
      
      return hasAggressiveDog;
    } catch (error) {
      console.error('Error checking for aggressive dogs:', error);
      return false;
    }
  };

  // Check if any aggressive dogs exist in the system
  const checkAggressiveDogsExist = async () => {
    try {
      const token = await getToken();
      if (!token) return false;
      
      // Use the same endpoint but with a query parameter
      const response = await fetch(`${environments.API_BASE_URL}/api/animals?temperament=aggressive`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        console.log('Error checking for aggressive dogs existence');
        return false;
      }
      
      const data = await response.json();
      const exist = data.length > 0;
      setAggressiveDogsExist(exist);
      
      return exist;
    } catch (error) {
      console.error('Error checking if aggressive dogs exist:', error);
      return false;
    }
  };

  // Update the lost dog status in real-time
  useEffect(() => {
    // Initial fetch of lost dogs
    fetchLostDogs();
    
    // Check if user has dogs or if they exist in system
    checkUserHasAggressiveDogs();
    checkAggressiveDogsExist();
    
    // Set up a refresh interval for lost dogs
    const refreshInterval = setInterval(() => {
      if (!isRefreshingLostDogs) {
        fetchLostDogs();
      }
    }, 60000); // Refresh every minute
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  // Update the button handler reference in the UI
  // Find the button that calls toggleLostAggressiveTracking and replace with toggleLostDogTracking
  <TouchableOpacity
    style={[
      styles.bottomMapButton,
      trackingEnabled ? styles.trackingActiveButton : styles.trackingInactiveButton
    ]}
    onPress={toggleLostDogTracking}
  >
    <MaterialCommunityIcons 
      name="dog-side" 
      size={24} 
      color="white" 
    />
    {trackingEnabled && <View style={styles.trackingIndicator} />}
  </TouchableOpacity>

  // Update the modal title to reflect all lost dogs, not just aggressive ones
  const LostDogsModalHeader = () => (
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>Lost Dogs</Text>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => setModalVisible(false)}
      >
        <Ionicons name="close" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // Update text to show all lost dogs information
  <Text style={styles.lostDogSummaryText}>
    <Text style={styles.lostDogCount}>{lostAggressiveDogs.length}</Text> {lostAggressiveDogs.length === 1 ? 'dog has' : 'dogs have'} been reported lost in your area.
  </Text>

  // Replace any other instances of "lost aggressive dogs" with "lost dogs" in UI text

  // Update toggle function to handle all lost dogs, not just aggressive ones
  const toggleLostDogTracking = async () => {
    if (trackingEnabled) {
      // If tracking is already enabled, show options
      Alert.alert(
        "Lost Dog Tracking",
        "What would you like to do?",
        [
          {
            text: "Stop Tracking",
            style: "destructive",
            onPress: () => {
              // Clear all intervals
              if (trackingInterval) {
                clearInterval(trackingInterval);
                setTrackingInterval(null);
              }
              if (proximityInterval) {
                clearInterval(proximityInterval);
                setProximityInterval(null);
              }
              
              // Disable tracking
              setTrackingEnabled(false);
              console.log('Lost dog tracking disabled by user');
            }
          },
          {
            text: "View Details",
            onPress: () => {
              // Show the lost dogs info
              setShowLostAggressiveInfo(true);
            }
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    } else {
      // Enable tracking for all lost dogs
      
      // First check if user has permission to receive notifications
      let notificationsPermitted = notificationsEnabled;
      
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          const { status: newStatus } = await Notifications.requestPermissionsAsync();
          notificationsPermitted = newStatus === 'granted';
          setNotificationsEnabled(notificationsPermitted);
        }
      } catch (err) {
        console.log('Error getting notification permissions:', err);
      }
      
      // Refresh data to ensure we have the latest
      await fetchLostDogs();
      
      // Check if there are any lost dogs in the system
      if (lostAggressiveDogs.length === 0) {
        Alert.alert(
          "No Lost Dogs Found",
          "No lost dogs were found in the area. Would you like to enable tracking anyway? You'll be notified when any dogs are reported lost.",
          [
            {
              text: "No",
              style: "cancel"
            },
            {
              text: "Yes, Enable Tracking",
              onPress: () => {
                // Set up interval to refresh data more frequently when tracking
                const interval = setInterval(fetchLostDogs, 30000); // Check every 30 seconds
                setTrackingInterval(interval);
                setTrackingEnabled(true);
                
                // Schedule proximity checks
                const proximityInterval = setInterval(checkProximityToLostDogs, 60000);
                setProximityInterval(proximityInterval);
                
                // Start pulsing animation to indicate active tracking
                startPulseAnimation();
                
                console.log('Lost dog tracking enabled with alert system active');
              }
            }
          ]
        );
        return;
      }
      
      // If we found lost dogs, enable tracking
      const interval = setInterval(fetchLostDogs, 30000); // Check every 30 seconds
      setTrackingInterval(interval);
      
      // Schedule proximity checks
      const proximityInterval = setInterval(checkProximityToLostDogs, 60000);
      setProximityInterval(proximityInterval);
      
      setTrackingEnabled(true);
      
      // Start pulsing animation
      startPulseAnimation();
      
      // Show the lost dogs on the map
      if (mapRef && lostAggressiveDogs.length > 0) {
        const lostRegion = getMapRegionForLostDogs(lostAggressiveDogs);
        if (lostRegion) {
          mapRef.animateToRegion(lostRegion, 1000);
        }
      }
      
      // Show info panel
      setShowLostAggressiveInfo(true);
    }
  };

  // Helper function to start pulse animation
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (trackingInterval) {
        clearInterval(trackingInterval);
      }
      if (proximityInterval) {
        clearInterval(proximityInterval);
      }
    };
  }, [trackingInterval, proximityInterval]);

  // Add function to check if user is near any lost aggressive dogs
  const checkProximityToLostDogs = async () => {
    if (!trackingEnabled || lostAggressiveDogs.length === 0) return;
    
    try {
      // Get user's current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      
      // Calculate distance to each lost aggressive dog
      let nearestDistance = Infinity;
      let nearestDog = null;
      
      lostAggressiveDogs.forEach(dog => {
        const dogLat = dog.latitude || dog.positionLatitude || dog.lastLocation?.latitude;
        const dogLng = dog.longitude || dog.positionLongitude || dog.lastLocation?.longitude;
        
        if (!dogLat || !dogLng) return;
        
        const distance = calculateDistance(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          dogLat,
          dogLng
        );
        
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestDog = dog;
        }
      });
      
      // If a dog is within threshold, send alert
      if (nearestDog && nearestDistance <= nearbyAlertThreshold && notificationsEnabled) {
        // Convert distance to appropriate unit
        const displayDistance = nearestDistance > 1000 
          ? `${(nearestDistance / 1000).toFixed(1)} km` 
          : `${Math.round(nearestDistance)} m`;
          
        Alert.alert(
          "⚠️ DANGER: Aggressive Dog Nearby",
          `A lost aggressive dog (${nearestDog.name || nearestDog.animalName || 'Unknown'}) is approximately ${displayDistance} from your location. Please be careful.`,
          [
            { text: "OK" },
            { 
              text: "Show on Map",
              onPress: () => {
                if (mapRef) {
                  mapRef.animateToRegion({
                    latitude: nearestDog.latitude || nearestDog.positionLatitude || nearestDog.lastLocation?.latitude,
                    longitude: nearestDog.longitude || nearestDog.positionLongitude || nearestDog.lastLocation?.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01
                  }, 1000);
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error checking proximity to lost dogs:', error);
    }
  };

  // Add distance calculation function
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
  };

  // Add useEffect for pulsing animation
  useEffect(() => {
    if (trackingEnabled && lostAggressiveDogs.length > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true
          })
        ])
      ).start();
      
      // Start proximity checking when tracking is enabled
      const proximityInterval = setInterval(checkProximityToLostDogs, 60000); // Check every minute
      return () => clearInterval(proximityInterval);
    } else {
      pulseAnim.setValue(1);
    }
  }, [trackingEnabled, lostAggressiveDogs.length]);

  // Optimize the rendering of status box to avoid flickering and ensure latest temperament
  const renderStatusBox = () => {
    // Safety check if currentLocation is null or doesn't have an id
    if (!currentLocation || currentLocation.id === '0' || viewAll) {
      return null;
    }
    
    // Get current animal's battery level and status with fallbacks
    const currentBatteryLevel = currentLocation?.battery || 'N/A';
    const connectionStatus = currentLocation?.status || 'Offline';
    
    const isUnsafe = unsafeAnimals.includes(currentLocation.id);
    const temperamentInfo = getTemperamentInfo(currentLocation.temperament, isUnsafe);
    
    const animalId = currentLocation.id;
    const dangerStatus = inDangerZone[animalId];
    const safeStatus = safeZoneStatuses[animalId];
    
    // Debug info for status box rendering
    console.log(`Rendering status box for animal ${currentLocation.animalName} (ID: ${animalId}), forceUpdate: ${forceUpdate}`);
    console.log('Danger status:', dangerStatus);
    console.log('Safe status:', safeStatus);
    
    let statusLabels = [];
    let dangerZoneLabel = null;
    let safeZoneLabel = null;
    
    // Prepare the danger zone label if applicable
    if (dangerStatus && dangerStatus.inDangerZone && dangerStatus.dangerType) {
      console.log(`RENDERING IN DANGER ZONE LABEL for ${currentLocation.animalName}: ${dangerStatus.dangerType}`);
      dangerZoneLabel = (
        <Text 
          key="danger" 
          style={[styles.statusLabel, { color: colors.danger, marginLeft: 8 }]}
        >
          In {dangerStatus.dangerType.charAt(0).toUpperCase() + dangerStatus.dangerType.slice(1)} Danger Zone
        </Text>
      );
    }
    
    // Prepare the safe zone label if applicable and not in danger zone
    if (territories.length > 0) {
      safeZoneLabel = (
        <Text 
          key="safe" 
          style={[styles.statusLabel, { 
            color: isUnsafe ? colors.unsafeZone : colors.safeZone,
            marginLeft: 8 
          }]}
        >
          {isUnsafe ? "Outside safe zone" : "Inside safe zone"}
        </Text>
      );
    }
    
    // If in a danger zone, prioritize that label
    if (dangerZoneLabel) {
      statusLabels = [dangerZoneLabel];
    } else if (safeZoneLabel) {
      statusLabels = [safeZoneLabel];
    }
    
    return (
      <View style={styles.statusBox}>
        <View style={styles.statusBoxContent}>
          <View style={styles.temperamentIconContainer}>
            <MaterialCommunityIcons 
              name={temperamentInfo.icon} 
              size={24} 
              color={temperamentInfo.color} 
            />
          </View>
          <View style={styles.statusTextContainer}>
            <Text style={styles.animalNameText}>
              {currentLocation.animalName}
            </Text>
            <View style={styles.statusLabelsContainer}>
              <Text style={[styles.statusLabel, { color: temperamentInfo.color }]}>
                {temperamentInfo.label}
              </Text>
              
              {/* Show danger zone status with priority */}
              {statusLabels}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Create a function to show the detailed info for a specific dog
  const showDogDetailedInfo = (dog) => {
    setSelectedLostDog(dog);
    setShowDetailedInfo(true);
  };

  // Determine map region
  const mapRegion = viewAll 
    ? getMapRegionForAllLocations(locations)
    : {
        latitude: currentLocation?.latitude || 54.687157,
        longitude: currentLocation?.longitude || 25.279652,
        latitudeDelta: 0.2, // Increased from 0.05 to 0.2 for much more zoom out
        longitudeDelta: 0.2, // Increased from 0.05 to 0.2 for much more zoom out
      };

  // Add the getTemperamentInfo function before it's used in renderStatusBox
  // Helper function to get temperament icon and color
  const getTemperamentInfo = (temperament, isUnsafe) => {
    switch(temperament) {
      case 'aggressive':
        return {
          icon: 'dog-side',
          color: colors.aggressive,
          label: 'Aggressive'
        };
      case 'friendly':
        return {
          icon: 'dog',
          color: colors.friendly,
          label: 'Friendly'
        };
      default:
        return {
          icon: 'dog-side',
          color: isUnsafe ? colors.unsafeZone : colors.neutral,
          label: 'Neutral'
        };
    }
  };

  // Function to update the real-time status badge on the dog profile page
  const updateDogStatusBadge = async (dogId, isLost) => {
    try {
      // Update AsyncStorage for immediate UI feedback
      const storedAnimalsString = await AsyncStorage.getItem('userAnimals');
      if (storedAnimalsString) {
        const storedAnimals = JSON.parse(storedAnimalsString);
        
        // Find and update the specific dog
        const updatedAnimals = storedAnimals.map(animal => {
          if (animal._id === dogId) {
            return { ...animal, isLost };
          }
          return animal;
        });
        
        // Save the updated animals back to storage
        await AsyncStorage.setItem('userAnimals', JSON.stringify(updatedAnimals));
        
        // If the dog is marked as lost and aggressive, trigger a fetch
        const affectedDog = updatedAnimals.find(animal => animal._id === dogId);
        if (affectedDog && affectedDog.temperament === 'aggressive' && isLost) {
          // Refresh the lost aggressive dogs list
          fetchLostDogs();
          
          // If tracking is already enabled, show the new dog on the map
          if (trackingEnabled && mapRef) {
            setTimeout(() => {
              fetchLostDogs().then(dogs => {
                if (dogs && dogs.length > 0) {
                  const region = getMapRegionForLostDogs(dogs);
                  if (region) {
                    mapRef.animateToRegion(region, 1000);
                  }
                }
              });
            }, 1000); // Give the server a moment to process
          }
        }
        
        // Update any UI that depends on this data
        if (navigation.getCurrentRoute().name === 'DogProfile') {
          navigation.setParams({ refreshProfile: Date.now() });
        }
      }
    } catch (error) {
      console.error('Error updating dog status badge:', error);
    }
  };
  
  // Listen for lost status updates from the dog profile
  useEffect(() => {
    // Set up event listener for lost status changes
    const lostStatusSubscription = navigation.addListener('focus', () => {
      // Refresh lost aggressive dogs when returning to Home screen
      fetchLostDogs();
    });
    
    // Listen for specific notifications about lost status changes
    const lostStatusChangeListener = async () => {
      try {
        const statusChangesString = await AsyncStorage.getItem('lostStatusChanges');
        if (statusChangesString) {
          const statusChanges = JSON.parse(statusChangesString);
          
          // Process each change
          for (const change of statusChanges) {
            await updateDogStatusBadge(change.dogId, change.isLost);
          }
          
          // Clear the changes after processing
          await AsyncStorage.setItem('lostStatusChanges', JSON.stringify([]));
        }
      } catch (error) {
        console.error('Error processing lost status changes:', error);
      }
    };
    
    // Check for status changes every few seconds
    const statusCheckInterval = setInterval(lostStatusChangeListener, 3000);
    
    return () => {
      lostStatusSubscription();
      clearInterval(statusCheckInterval);
    };
  }, [navigation]);
  
  // Function to mark a dog as found directly from the track list
  const markDogAsFound = async (dogId) => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Error", "You need to be logged in to perform this action.");
        return;
      }
      
      const response = await fetch(`${environments.API_BASE_URL}/api/animals/${dogId}/lost`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isLost: false })
      });
      
      if (response.ok) {
        // Update the dog in the local state
        const updatedLostDogs = lostAggressiveDogs.filter(dog => dog._id !== dogId);
        setLostAggressiveDogs(updatedLostDogs);
        
        // Update the badge locally
        updateDogStatusBadge(dogId, false);
        
        // Show success message
        Alert.alert(
          "Dog Marked as Found",
          "This dog has been removed from the lost aggressive dogs list.",
          [{ text: "OK" }]
        );
        
        // Close modals if needed
        setShowDetailedInfo(false);
        setShowLostAggressiveInfo(false);
        
        // If no more lost dogs and tracking is enabled, ask if user wants to disable tracking
        if (updatedLostDogs.length === 0 && trackingEnabled) {
          Alert.alert(
            "No More Lost Dogs",
            "There are no more lost aggressive dogs to track. Would you like to disable tracking?",
            [
              { text: "Keep Tracking", style: "cancel" },
              { 
                text: "Disable Tracking",
                onPress: () => {
                  if (trackingInterval) clearInterval(trackingInterval);
                  if (proximityInterval) clearInterval(proximityInterval);
                  setTrackingEnabled(false);
                  setTrackingInterval(null);
                  setProximityInterval(null);
                }
              }
            ]
          );
        }
      } else {
        const errorData = await response.json();
        Alert.alert("Error", errorData.message || "Could not update the dog's status.");
      }
    } catch (error) {
      console.error('Error marking dog as found:', error);
      Alert.alert("Error", "There was a problem updating the dog's status. Please try again.");
    }
  };

  // Get current user ID during initialization
  useEffect(() => {
    const getUserId = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (userId) {
          setCurrentUserId(userId);
        }
      } catch (error) {
        console.error('Error getting user ID:', error);
      }
    };
    
    getUserId();
  }, []);

  // Add performance optimizations for map loading
  useEffect(() => {
    // Initial fetch of data
    fetchDeviceData();
    loadTerritories();
    fetchLostDogs();
    
    // Set up less frequent intervals for background updates
    const deviceDataInterval = setInterval(fetchDeviceData, 5000); // Reduce from 2000ms to 5000ms
    const territoriesInterval = setInterval(loadTerritories, 10000); // Reduce from 5000ms to 10000ms
    const lostDogsInterval = setInterval(fetchLostDogs, 15000); // Set a reasonable interval
    
    return () => {
      clearInterval(deviceDataInterval);
      clearInterval(territoriesInterval);
      clearInterval(lostDogsInterval);
    };
  }, []);

  // Optimize the MapView with useCallback for memoization
  const onMapReady = useCallback(() => {
    console.log("Map is ready");
  }, []);

  // Optimize map markers with useMemo
  const animalMarkers = useMemo(() => {
    return locations.map((location, index) => (
      <Marker
        key={`location-${location.id}`}
        coordinate={{
          latitude: location.latitude,
          longitude: location.longitude,
        }}
        title={location.animalName}
        description={location.status === 'Online' ? 'Online' : 'Offline'}
        onPress={() => navigateToDevicePage(location)}
      >
        <View style={styles.markerContainer}>
          <View
            style={[
              styles.marker,
              location.status === 'Online'
                ? styles.onlineMarker
                : styles.offlineMarker,
              unsafeAnimals.includes(location.id) && styles.unsafeMarker,
            ]}
          >
            <Image source={DogImage} style={styles.dogMarkerImage} />
          </View>
          {location.temperament === 'aggressive' && (
            <View style={styles.aggressiveIndicator} />
          )}
        </View>
      </Marker>
    ));
  }, [locations, unsafeAnimals, navigateToDevicePage]);

  // Optimize lost dog markers with useMemo
  const lostDogMarkers = useMemo(() => {
    if (!trackingEnabled) return null;
    
    return lostAggressiveDogs.map((dog, index) => {
      const dogLat = dog.latitude || dog.positionLatitude || dog.lastLocation?.latitude;
      const dogLng = dog.longitude || dog.positionLongitude || dog.lastLocation?.longitude;
      
      if (!dogLat || !dogLng) return null;
      
      return (
        <Marker
          key={`lost-dog-${dog._id || index}`}
          coordinate={{
            latitude: dogLat,
            longitude: dogLng,
          }}
          title={`${dog.name || 'Unknown Dog'} (LOST)`}
          description={`Lost dog - ${dog.breed || 'Unknown breed'}`}
          onPress={() => {
            setSelectedLostDog(dog);
            setShowDetailedInfo(true);
          }}
        >
          <View style={styles.lostDogMarkerContainer}>
            <Animated.View 
              style={[
                styles.lostAggressivePulse,
                { transform: [{ scale: pulseAnim }] }
              ]} 
            />
            <View style={styles.lostDogMarker}>
              <MaterialCommunityIcons 
                name="dog-side" 
                size={24} 
                color="#fff" 
              />
            </View>
            <View style={styles.lostAggressiveLabel}>
              <Text style={styles.lostAggressiveLabelText}>LOST</Text>
            </View>
          </View>
        </Marker>
      );
    });
  }, [trackingEnabled, lostAggressiveDogs, pulseAnim, setSelectedLostDog, setShowDetailedInfo]);

  // Add useEffect for checking danger zones and safe zones regularly
  useEffect(() => {
    // Check initially
    checkSafeZones();
    checkDangerZones();
    
    // Set up interval for periodic checking
    const checkInterval = setInterval(() => {
      checkSafeZones();
      checkDangerZones();
    }, 3000); // Check every 3 seconds
    
    // Clear interval on component unmount
    return () => clearInterval(checkInterval);
  }, [locations, territories, dangerZones, forceUpdate]);

  // Add dependency on forceUpdate in the renderStatusBox useEffect
  useEffect(() => {
    // Update the status box whenever related data changes
    if (currentLocation) {
      checkSafeZones();
      checkDangerZones();
    }
  }, [currentLocation, territories, dangerZones, forceUpdate]);

  // Add useEffect to periodically check for danger zone updates from other screens
  useEffect(() => {
    // Initial check
    loadDangerZones();
    
    // Set up periodic checks for danger zone updates
    const dangerZoneUpdateCheckInterval = setInterval(async () => {
      try {
        // Check if danger zones have been updated
        const dangerzoneUpdated = await AsyncStorage.getItem('dangerZonesUpdated');
        const lastUpdated = await AsyncStorage.getItem('dangerZonesLastUpdated');
        
        if (dangerzoneUpdated === 'true') {
          console.log('🔄 Detected danger zone updates, reloading...');
          loadDangerZones();
        } else if (lastUpdated) {
          // Check if the last update was recent (within last 30 seconds)
          const lastUpdateTime = new Date(lastUpdated).getTime();
          const now = new Date().getTime();
          if (now - lastUpdateTime < 30000) {
            console.log('🔄 Recent danger zone update detected, reloading...');
            loadDangerZones();
          }
        }
      } catch (error) {
        console.error('Error checking for danger zone updates:', error);
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(dangerZoneUpdateCheckInterval);
  }, []);

  // Function to get danger zone color based on type
  const getDangerZoneColor = (type) => {
    switch (type) {
      case 'highway':
        return 'rgba(255, 0, 0, 0.5)';
      case 'river':
        return 'rgba(0, 0, 255, 0.5)';
      case 'wildlife':
        return 'rgba(139, 69, 19, 0.5)';
      case 'cliff':
        return 'rgba(128, 128, 128, 0.5)';
      case 'road':
        return 'rgba(255, 165, 0, 0.5)';
      default:
        return 'rgba(255, 0, 0, 0.5)';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Image source={DogImage} style={styles.dogIcon} />
          <Text style={styles.title}>{viewAll ? 'All Animals' : currentLocation?.animalName}</Text>
        </View>
        <View style={styles.statusIcons}>
          <View style={styles.statusIconsRow}>
            <FontAwesome6 
              name="wifi" 
              size={20} 
              color={(currentLocation?.status === 'Online') ? colors.yellow : colors.gray} 
            />
            <Text style={styles.statusText}>{viewAll ? '' : (currentLocation?.status || 'Offline')}</Text>
          </View>
          <View style={styles.statusIconsRow}>
            <FontAwesome6 
              name="battery-full" 
              size={20} 
              color={(currentLocation?.battery !== undefined && currentLocation?.battery !== 'N/A') ? colors.yellow : colors.gray} 
            />
            <Text style={styles.statusText}>{viewAll ? '' : (currentLocation?.battery || 'N/A')}%</Text>
          </View>
        </View>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={(ref) => setMapRef(ref)}
          style={styles.map}
          mapType={mapType}
          initialRegion={mapRegion}
          region={mapRegion}
          showsUserLocation={true}
          onMapReady={onMapReady}
          maxZoomLevel={19}
          minZoomLevel={10}
          moveOnMarkerPress={false}
        >
          {/* Display territories/safe zones as polygons */}
          {territories.map((territory) => (
            <Polygon
              key={territory._id}
              coordinates={territory.coordinates}
              fillColor="rgba(0, 128, 0, 0.2)"
              strokeColor="rgba(0, 128, 0, 0.8)"
              strokeWidth={2}
            />
          ))}

          {/* Display danger zones as polygons */}
          {dangerZones.map((zone) => (
            <Polygon
              key={zone._id}
              coordinates={zone.coordinates}
              fillColor={getDangerZoneColor(zone.dangerType)}
              strokeColor="red"
              strokeWidth={2}
            />
          ))}

          {/* Display locations as markers */}
          {animalMarkers}

          {/* Display lost dogs on map when tracking is enabled */}
          {lostDogMarkers}
        </MapView>

        {renderStatusBox()}

        {/* Bottom Map Controls */}
        <View style={styles.bottomMapControls}>
          {/* Lost Dog Tracking Button - updated text to be inclusive of all lost dogs, not just aggressive ones */}
          <TouchableOpacity
            style={[
              styles.bottomMapButton,
              trackingEnabled ? styles.trackingActiveButton : styles.trackingInactiveButton
            ]}
            onPress={toggleLostDogTracking}
          >
            <MaterialCommunityIcons 
              name="dog-side" 
              size={24} 
              color="white" 
            />
            {trackingEnabled && <View style={styles.trackingIndicator} />}
          </TouchableOpacity>

          {/* Map Type Button */}
          <TouchableOpacity 
            style={styles.bottomMapButton}
            onPress={() => setMapSettingsVisible(true)}
          >
            <FontAwesome name="map" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.navigationButtons}>
        {!viewAll && (
          <TouchableOpacity 
            style={[styles.arrowButton, currentLocationIndex === 0 && styles.disabledButton]} 
            onPress={goToPreviousAnimal} 
            disabled={currentLocationIndex === 0}
          >
            <MaterialIcons name="arrow-back-ios-new" size={20} color={currentLocationIndex === 0 ? colors.gray : colors.yellow} />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.walkButton} onPress={toggleViewAll}>
          <Text style={styles.walkButtonText}>{viewAll ? 'View Single Animal' : 'View All Animals'}</Text>
        </TouchableOpacity>
        
        {!viewAll && (
          <TouchableOpacity 
            style={[styles.arrowButton, currentLocationIndex === locations.length - 1 && styles.disabledButton]} 
            onPress={goToNextAnimal} 
            disabled={currentLocationIndex === locations.length - 1}
          >
            <MaterialIcons name="arrow-forward-ios" size={20} color={currentLocationIndex === locations.length - 1 ? colors.gray : colors.yellow} />
          </TouchableOpacity>
        )}
      </View>

      {!viewAll && locations.length > 1 && (
        <View style={styles.paginationIndicator}>
          {locations.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.paginationDot, 
                index === currentLocationIndex && styles.activePaginationDot
              ]} 
            />
          ))}
        </View>
      )}

      <Modal animationType="fade" transparent={true} visible={mapSettingsVisible} onRequestClose={() => setMapSettingsVisible(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Map Settings</Text>
              <Pressable onPress={() => setMapSettingsVisible(false)} style={styles.closeButton}>
                <FontAwesome name="close" size={20} color={colors.yellow} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalText}>Control what you see on the map</Text>
              <View style={styles.modalContainer}>
                <Pressable style={styles.mapTypeButton} onPress={() => changeMapType('standard')}>
                  <Image source={Standard} style={styles.mapPictures} />
                  <Text style={styles.mapTypeText}>Standard</Text>
                </Pressable>
                <Pressable style={styles.mapTypeButton} onPress={() => changeMapType('satellite')}>
                  <Image source={Satellite} style={styles.mapPictures} />
                  <Text style={styles.mapTypeText}>Satellite</Text>
                </Pressable>
                <Pressable style={styles.mapTypeButton} onPress={() => changeMapType('hybrid')}>
                  <Image source={Hybrid} style={styles.mapPictures} />
                  <Text style={styles.mapTypeText}>Hybrid</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Real-time Alert Toggle Button */}
      {trackingEnabled && (
        <TouchableOpacity
          style={[
            styles.notificationToggleButton,
            notificationsEnabled ? styles.notificationsEnabled : styles.notificationsDisabled
          ]}
          onPress={() => setNotificationsEnabled(!notificationsEnabled)}
        >
          <MaterialIcons 
            name={notificationsEnabled ? "notifications-active" : "notifications-off"} 
            size={24} 
            color="white" 
          />
          <Text style={styles.notificationToggleText}>
            {notificationsEnabled ? 'Alerts On' : 'Alerts Off'}
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Button to show lost dogs list - repositioned higher */}
      {trackingEnabled && (
        <TouchableOpacity
          style={styles.viewLostDogsButton}
          onPress={() => setShowLostAggressiveInfo(true)}
        >
          <MaterialCommunityIcons name="dog-side" size={20} color="white" />
          <Text style={styles.viewLostDogsText}>
            {lostAggressiveDogs.length > 0 
              ? `View ${lostAggressiveDogs.length} Lost Dog${lostAggressiveDogs.length !== 1 ? 's' : ''}`
              : 'No Lost Dogs Found'}
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Lost Dogs Modal - updated to use showLostAggressiveInfo consistently */}
      <Modal
        visible={showLostAggressiveInfo}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLostAggressiveInfo(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.lostAggressiveSummaryContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lost Dogs</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowLostAggressiveInfo(false)}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {lostAggressiveDogs.length > 0 ? (
              <ScrollView style={styles.lostAggressiveList}>
                {lostAggressiveDogs.map((dog, index) => (
                  <TouchableOpacity 
                    key={`summary-${dog._id || index}`}
                    style={styles.lostDogSummaryItem}
                    onPress={() => {
                      setSelectedLostDog(dog);
                      setShowDetailedInfo(true);
                      setShowLostAggressiveInfo(false);
                    }}
                  >
                    <View style={styles.lostDogItemHeader}>
                      <Text style={styles.lostDogName}>{dog.name || dog.animalName || 'Unknown Dog'}</Text>
                      {dog.temperament === 'aggressive' && (
                        <View style={styles.lostDogBadge}>
                          <Text style={styles.lostDogBadgeText}>AGGRESSIVE</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={styles.lostDogBreed}>{dog.breed || 'Unknown breed'}</Text>
                    <Text style={styles.lostDogLastSeen}>
                      Last seen: {dog.lastSeen ? moment(dog.lastSeen).fromNow() : 
                        (dog.lostSince ? moment(dog.lostSince).fromNow() : 
                          (dog.lastLocation?.timestamp ? moment(dog.lastLocation.timestamp).fromNow() : 'Unknown'))}
                    </Text>
                    
                    <View style={styles.lostDogItemFooter}>
                      <MaterialIcons name="info-outline" size={16} color="#4CAF50" />
                      <Text style={styles.viewDetailsText}>View detailed information</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noLostDogs}>
                <MaterialCommunityIcons name="dog-side" size={50} color="#666" />
                <Text style={styles.noLostDogsText}>No lost dogs found</Text>
                <Text style={styles.noLostDogsSubtext}>
                  Check again later or expand your search area
                </Text>
                <TouchableOpacity 
                  style={styles.closeModalButton}
                  onPress={() => setShowLostAggressiveInfo(false)}
                >
                  <Text style={styles.closeModalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Detailed Lost Dog Information Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showDetailedInfo && selectedLostDog !== null}
        onRequestClose={() => {
          setShowDetailedInfo(false);
          // Don't show the list modal again automatically
        }}
      >
        <View style={styles.modalBackground}>
          <View style={styles.detailedInfoContainer}>
            <View style={styles.detailedInfoHeader}>
              <View style={styles.headerContent}>
                <Text style={styles.detailedInfoTitle}>Lost Dog Details</Text>
                <View style={styles.statusBadgeContainer}>
                  {selectedLostDog?.temperament === 'aggressive' && (
                    <View style={styles.dangerBadge}>
                      <MaterialIcons name="warning" size={18} color="white" />
                      <Text style={styles.dangerBadgeText}>AGGRESSIVE</Text>
                    </View>
                  )}
                  <View style={styles.lostBadge}>
                    <MaterialIcons name="error-outline" size={18} color="white" />
                    <Text style={styles.lostBadgeText}>MISSING</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDetailedInfo(false)}
              >
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            {selectedLostDog && (
              <ScrollView style={styles.detailedInfoContent}>
                {/* Dog Image Section */}
                <View style={styles.dogIconContainer}>
                  <Text style={styles.largeDogEmoji}>🐕</Text>
                  {selectedLostDog.isLost && (
                    <View style={styles.lostTimeContainer}>
                      <Text style={styles.lostTimeLabel}>Lost since:</Text>
                      <Text style={styles.lostTimeValue}>
                        {selectedLostDog.lostSince 
                          ? moment(selectedLostDog.lostSince).format('MMM D, YYYY [at] h:mm A') 
                          : 'Unknown'}
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* Basic Information Section */}
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Dog Information</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Name:</Text>
                    <Text style={styles.infoValue}>{selectedLostDog.name || selectedLostDog.animalName || 'Unknown'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Breed:</Text>
                    <Text style={styles.infoValue}>{selectedLostDog.breed || 'Unknown breed'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Gender:</Text>
                    <Text style={styles.infoValue}>{selectedLostDog.gender || 'Unknown'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Age:</Text>
                    <Text style={styles.infoValue}>{selectedLostDog.age || 'Unknown'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Weight:</Text>
                    <Text style={styles.infoValue}>{selectedLostDog.weight ? `${selectedLostDog.weight} kg` : 'Unknown'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Height:</Text>
                    <Text style={styles.infoValue}>{selectedLostDog.height ? `${selectedLostDog.height} cm` : 'Unknown'}</Text>
                  </View>
                  {selectedLostDog.owner && (
                    <View style={styles.ownerSection}>
                      <Text style={styles.ownerLabel}>Reported by:</Text>
                      <Text style={styles.ownerValue}>{selectedLostDog.owner.name || selectedLostDog.owner.email || 'Anonymous'}</Text>
                    </View>
                  )}
                </View>
                
                {/* Live Status Section */}
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Live Status</Text>
                  <View style={styles.statusIndicators}>
                    <View style={[
                      styles.statusIndicator, 
                      selectedLostDog.device?.status === 'Online' ? styles.statusOnline : styles.statusOffline
                    ]}>
                      <MaterialIcons 
                        name={selectedLostDog.device?.status === 'Online' ? "wifi" : "wifi-off"} 
                        size={20} 
                        color="white" 
                      />
                      <Text style={styles.statusIndicatorText}>
                        {selectedLostDog.device?.status || 'Unknown'}
                      </Text>
                    </View>
                    
                    <View style={[
                      styles.statusIndicator, 
                      selectedLostDog.lastUpdated ? styles.statusRecent : styles.statusOld
                    ]}>
                      <MaterialIcons 
                        name="update" 
                        size={20} 
                        color="white" 
                      />
                      <Text style={styles.statusIndicatorText}>
                        {selectedLostDog.lastUpdated 
                          ? `Updated ${moment(selectedLostDog.lastUpdated).fromNow()}` 
                          : 'No updates'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {/* Device Information Section */}
                {selectedLostDog.device && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>Device Information</Text>
                    <View style={styles.deviceInfoBox}>
                      <View style={styles.deviceInfoItem}>
                        <MaterialIcons name="battery-std" size={24} color="#4CAF50" />
                        <View style={styles.deviceInfoContent}>
                          <Text style={styles.deviceInfoLabel}>Battery</Text>
                          <Text style={styles.deviceInfoValue}>
                            {selectedLostDog.device.battery || 'N/A'}%
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.deviceInfoItem}>
                        <MaterialIcons name="perm-device-info" size={24} color="#2196F3" />
                        <View style={styles.deviceInfoContent}>
                          <Text style={styles.deviceInfoLabel}>Device ID</Text>
                          <Text style={styles.deviceInfoValue}>
                            {selectedLostDog.device.deviceId || 'Unknown'}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.deviceInfoItem}>
                        <MaterialIcons name="schedule" size={24} color="#FF9800" />
                        <View style={styles.deviceInfoContent}>
                          <Text style={styles.deviceInfoLabel}>Last Connection</Text>
                          <Text style={styles.deviceInfoValue}>
                            {selectedLostDog.device.lastConnected 
                              ? moment(selectedLostDog.device.lastConnected).fromNow() 
                              : 'Unknown'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
                
                {/* Location Section */}
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Location Details</Text>
                  <View style={styles.locationBox}>
                    <View style={styles.locationHeader}>
                      <MaterialIcons name="location-on" size={24} color="#FF5722" />
                      <Text style={styles.locationTitle}>Last Known Location</Text>
                    </View>
                    
                    <Text style={styles.locationAddress}>
                      {selectedLostDog.lastLocation?.address || 'Location data unavailable'}
                    </Text>
                    
                    <View style={styles.coordinatesContainer}>
                      <Text style={styles.coordinatesLabel}>GPS Coordinates:</Text>
                      <Text style={styles.coordinatesValue}>
                        {(selectedLostDog.latitude || selectedLostDog.positionLatitude || selectedLostDog.lastLocation?.latitude)?.toFixed(6) || '?'}, 
                        {(selectedLostDog.longitude || selectedLostDog.positionLongitude || selectedLostDog.lastLocation?.longitude)?.toFixed(6) || '?'}
                      </Text>
                    </View>
                    
                    <Text style={styles.locationTimestamp}>
                      Last updated: {selectedLostDog.lastLocation?.timestamp 
                        ? moment(selectedLostDog.lastLocation.timestamp).format('MMM D, YYYY [at] h:mm A')
                        : 'Unknown'}
                    </Text>
                  </View>
                </View>
                
                {/* Safety Section - Only show for aggressive dogs */}
                {selectedLostDog.temperament === 'aggressive' && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>Safety Information</Text>
                    <View style={styles.warningBox}>
                      <MaterialIcons name="error-outline" size={24} color="#ff3131" />
                      <Text style={styles.warningText}>
                        This dog is marked as aggressive. Please use caution if encountered.
                        Do not approach this dog directly.
                      </Text>
                    </View>
                    
                    <View style={styles.safetyTipsContainer}>
                      <Text style={styles.safetyTipsHeader}>If you see this dog:</Text>
                      <View style={styles.safetyTip}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.safetyTipText}>Keep a safe distance</Text>
                      </View>
                      <View style={styles.safetyTip}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.safetyTipText}>Call the owner if contact info is available</Text>
                      </View>
                      <View style={styles.safetyTip}>
                        <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.safetyTipText}>Alert local animal control</Text>
                      </View>
                      <View style={styles.safetyTip}>
                        <MaterialIcons name="cancel" size={16} color="#ff3131" />
                        <Text style={styles.safetyTipText}>Do not attempt to capture the dog yourself</Text>
                      </View>
                    </View>
                  </View>
                )}
                
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      if (mapRef) {
                        const lat = selectedLostDog.latitude || selectedLostDog.positionLatitude || selectedLostDog.lastLocation?.latitude || 0;
                        const lng = selectedLostDog.longitude || selectedLostDog.positionLongitude || selectedLostDog.lastLocation?.longitude || 0;
                        
                        mapRef.animateToRegion({
                          latitude: lat,
                          longitude: lng,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01
                        }, 1000);
                        setShowDetailedInfo(false);
                      }
                    }}
                  >
                    <MaterialIcons name="location-on" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Show on Map</Text>
                  </TouchableOpacity>
                  
                  {/* Only show mark as found if user has permission */}
                  {selectedLostDog.owner && selectedLostDog.owner._id === currentUserId && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.foundButton]}
                      onPress={() => {
                        Alert.alert(
                          "Mark Dog as Found?",
                          `Are you sure you want to mark ${selectedLostDog.name || 'this dog'} as found? This will remove the dog from the lost dogs list.`,
                          [
                            { text: "Cancel", style: "cancel" },
                            { 
                              text: "Mark as Found", 
                              onPress: () => markDogAsFound(selectedLostDog._id)
                            }
                          ]
                        );
                      }}
                    >
                      <MaterialIcons name="check-circle" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Mark as Found</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Lost Aggressive Dogs Summary Popup */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showLostAggressiveInfo}
        onRequestClose={() => setShowLostAggressiveInfo(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.lostAggressiveSummaryContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lost Dogs</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowLostAggressiveInfo(false)}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {lostAggressiveDogs.length > 0 ? (
              <ScrollView style={styles.lostAggressiveList}>
                {lostAggressiveDogs.map((dog, index) => (
                  <TouchableOpacity 
                    key={`summary-${dog._id || index}`}
                    style={styles.lostDogSummaryItem}
                    onPress={() => {
                      setSelectedLostDog(dog);
                      setShowDetailedInfo(true);
                      setShowLostAggressiveInfo(false);
                    }}
                  >
                    <View style={styles.lostDogItemHeader}>
                      <Text style={styles.lostDogName}>{dog.name || dog.animalName || 'Unknown Dog'}</Text>
                      {dog.temperament === 'aggressive' && (
                        <View style={styles.lostDogBadge}>
                          <Text style={styles.lostDogBadgeText}>AGGRESSIVE</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={styles.lostDogBreed}>{dog.breed || 'Unknown breed'}</Text>
                    <Text style={styles.lostDogLastSeen}>
                      Last seen: {dog.lastSeen ? moment(dog.lastSeen).fromNow() : 
                        (dog.lostSince ? moment(dog.lostSince).fromNow() : 
                          (dog.lastLocation?.timestamp ? moment(dog.lastLocation.timestamp).fromNow() : 'Unknown'))}
                    </Text>
                    
                    <View style={styles.lostDogItemFooter}>
                      <MaterialIcons name="info-outline" size={16} color="#4CAF50" />
                      <Text style={styles.viewDetailsText}>View detailed information</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noLostDogs}>
                <MaterialCommunityIcons name="dog-side" size={50} color="#666" />
                <Text style={styles.noLostDogsText}>No lost dogs found</Text>
                <Text style={styles.noLostDogsSubtext}>
                  Check again later or expand your search area
                </Text>
                <TouchableOpacity 
                  style={styles.closeModalButton}
                  onPress={() => setShowLostAggressiveInfo(false)}
                >
                  <Text style={styles.closeModalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Helper function to calculate appropriate map region when showing all locations
const getMapRegionForAllLocations = (locations) => {
  if (!locations || locations.length === 0) {
    return {
      latitude: 54.687157,
      longitude: 25.279652,
      latitudeDelta: 1.0, // Significantly increased for much more zoom out
      longitudeDelta: 1.0, // Significantly increased for much more zoom out
    };
  }

  // Calculate bounds
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  locations.forEach(location => {
    minLat = Math.min(minLat, location.latitude);
    maxLat = Math.max(maxLat, location.latitude);
    minLng = Math.min(minLng, location.longitude);
    maxLng = Math.max(maxLng, location.longitude);
  });

  // Add padding
  const latPadding = Math.max((maxLat - minLat) * 2.0, 0.5); // Much more padding
  const lngPadding = Math.max((maxLng - minLng) * 2.0, 0.5); // Much more padding

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: (maxLat - minLat) + latPadding,
    longitudeDelta: (maxLng - minLng) + lngPadding,
  };
};

// Also update the function for lost dogs map region
const getMapRegionForLostDogs = (lostDogs) => {
  if (!lostDogs || lostDogs.length === 0) {
    return {
      latitude: 54.687157,
      longitude: 25.279652,
      latitudeDelta: 1.0, // Significantly increased for much more zoom out
      longitudeDelta: 1.0, // Significantly increased for much more zoom out
    };
  }

  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  lostDogs.forEach(dog => {
    const lat = dog.latitude || dog.positionLatitude || (dog.lastLocation && dog.lastLocation.latitude);
    const lng = dog.longitude || dog.positionLongitude || (dog.lastLocation && dog.lastLocation.longitude);
    
    if (lat && lng) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
  });

  // If we couldn't find any valid coordinates, return a default region
  if (minLat === 90 || maxLat === -90 || minLng === 180 || maxLng === -180) {
    return {
      latitude: 54.687157,
      longitude: 25.279652,
      latitudeDelta: 1.0, // Significantly increased for much more zoom out
      longitudeDelta: 1.0, // Significantly increased for much more zoom out
    };
  }

  // Add padding
  const latPadding = Math.max((maxLat - minLat) * 2.0, 0.5); // Much more padding for lost dogs
  const lngPadding = Math.max((maxLng - minLng) * 2.0, 0.5); // Much more padding for lost dogs

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: (maxLat - minLat) + latPadding,
    longitudeDelta: (maxLng - minLng) + lngPadding,
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  statusIconsRow: {
    alignItems: 'center',
    marginLeft: 10,
  },
  dogIcon: { width: 30, height: 40, marginLeft: 8 },
  title: { fontSize: 20, fontWeight: '600', marginLeft: 5 },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: { fontSize: 12, textAlign: 'center' },
  mapContainer: {
    position: 'relative',
    width: '100%',
    height: '75%',
    borderRadius: 10,
  },
  map: { flex: 1 },
  mapControlsContainer: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    alignItems: 'center',
  },
  mapButton: {
    height: 50,
    width: 50,
    borderRadius: 25,
    backgroundColor: colors.yellow,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  address: { fontSize: 18, marginTop: 10, fontWeight: '600' },
  walkButton: {
    borderColor: colors.black,
    borderWidth: 1,
    backgroundColor: colors.yellow,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 50,
    alignSelf: 'center',
    marginHorizontal: 15,
    width: '60%',
  },
  walkButtonText: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 1 },

  // Modal Styles
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.yellow,
    borderRadius: 10,
    padding: 5,
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  modalContent: {
    width: '90%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.black,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
  },
  modalBody: {
    marginTop: 10,
  },
  modalText: {
    fontSize: 16,
    color: colors.black,
    textAlign: 'center',
  },
  mapPictures: {
    width: 70,
    height: 70,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.black,
  },
  mapTypeButton: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    marginVertical: 10,
  },
  mapTypeText: {
    fontSize: 16,
    color: colors.black,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 5,
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
    marginTop: 15,
  },
  arrowButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerIcon: {
    width: 36,
    height: 36,
  },
  pulseAnimation: {
    transform: [{ scale: 1.1 }],
  },
  recentlyChangedIndicator: {
    position: 'absolute',
    top: -20,
    backgroundColor: '#FFC107',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 1,
  },
  recentlyChangedText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  safetyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    position: 'absolute',
    top: 210,
    alignSelf: 'center',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  paginationIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray,
    marginHorizontal: 4,
  },
  activePaginationDot: {
    backgroundColor: colors.yellow,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  disabledButton: {
    opacity: 0.5,
  },
  topLeftStatusBox: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  statusTextContainer: {
    marginLeft: 5,
    flexDirection: 'column',
  },
  animalNameText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  outOfZoneMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5252',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    position: 'absolute',
    top: -45,
    alignSelf: 'center',
    minWidth: 110,
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  outOfZoneText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
    textAlign: 'center',
  },
  statusBox: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusBoxContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  temperamentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    marginRight: 10,
  },
  statusTextContainer: {
    flex: 1,
  },
  animalNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: 2,
  },
  statusLabelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  lostAggressiveTrackingButton: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    width: '90%',
    marginHorizontal: 'auto',
    zIndex: 10,
  },
  trackingActiveButton: {
    backgroundColor: '#ff3131',
    borderWidth: 2,
    borderColor: '#fff',
  },
  trackingInactiveButton: {
    backgroundColor: '#4caf50',
  },
  trackingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  trackingButtonIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
  },
  pulsingDot: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff0',
  },
  trackingButtonTextContainer: {
    flex: 1,
  },
  trackingButtonTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  trackingButtonSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  lostAggressiveMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lostAggressiveMarker: {
    backgroundColor: '#ff3131',
    padding: 8,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  lostAggressivePulse: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 49, 49, 0.3)',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 49, 49, 0.5)',
    transform: [{ scale: 1.2 }],
  },
  lostAggressiveLabel: {
    backgroundColor: '#ff3131',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    position: 'absolute',
    bottom: -10,
    borderWidth: 1,
    borderColor: '#fff',
  },
  lostAggressiveLabelText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 10,
  },
  viewLostAggressiveButton: {
    position: 'absolute',
    bottom: 220, // Higher position to avoid overlapping with bottom buttons
    left: 20,
    right: 20,
    backgroundColor: '#ff3131',
    padding: 14,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    borderWidth: 1,
    borderColor: '#fff',
    zIndex: 999, // Ensure it appears above other elements
  },
  viewLostAggressiveText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 10,
    fontSize: 16,
  },
  lostAggressiveModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  lostAggressiveList: {
    maxHeight: '90%',
  },
  lostAggressiveItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ff5252',
  },
  lostAggressiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  lostAggressiveName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  aggressiveBadge: {
    backgroundColor: '#ff5252',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  aggressiveBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 3,
  },
  lostAggressiveBreed: {
    fontSize: 14,
    marginBottom: 5,
    color: '#555',
  },
  lostAggressiveTime: {
    fontSize: 13,
    color: '#777',
    marginBottom: 3,
  },
  lostAggressiveLocation: {
    fontSize: 13,
    color: '#777',
  },
  noLostDogs: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  noLostDogsText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    textAlign: 'center',
  },
  noLostDogsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  notificationToggleButton: {
    position: 'absolute',
    top: 180,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 20,
    elevation: 4,
  },
  notificationsEnabled: {
    backgroundColor: '#2196F3',
  },
  notificationsDisabled: {
    backgroundColor: '#757575',
  },
  notificationToggleText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  dogEmoji: {
    fontSize: 24,
  },
  lostDogTrackingDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFF00',
  },
  largeDogEmoji: {
    fontSize: 72,
    textAlign: 'center',
    marginVertical: 10,
  },
  detailedInfoContainer: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  detailedInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
    marginBottom: 15,
  },
  headerContent: {
    flex: 1,
  },
  detailedInfoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  dangerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff3131',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginRight: 8,
  },
  lostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  dangerBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  lostBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  ownerSection: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerLabel: {
    fontWeight: 'bold',
    color: '#555',
    marginRight: 5,
  },
  ownerValue: {
    color: '#333',
  },
  safetyTipsContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  safetyTipsHeader: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  safetyTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  safetyTipText: {
    marginLeft: 6,
    color: '#333',
    fontSize: 13,
  },
  actionButtonsContainer: {
    flexDirection: 'column',
    marginVertical: 20,
  },
  actionButton: {
    backgroundColor: '#4caf50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  foundButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  lostAggressiveSummaryContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
  },
  lostDogSummaryText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 15,
    color: '#333',
  },
  lostDogCount: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#ff3131',
  },
  lostDogList: {
    maxHeight: '70%',
  },
  lostDogSummaryItem: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ff3131',
  },
  lostDogItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  lostDogName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  lostDogBadge: {
    backgroundColor: '#ff3131',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  lostDogBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  lostDogBreed: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  lostDogLastSeen: {
    fontSize: 13,
    color: '#888',
    marginBottom: 10,
  },
  lostDogItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 5,
    fontWeight: '500',
  },
  stopTrackingButton: {
    backgroundColor: '#ff3131',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
  },
  stopTrackingText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  noLostDogsEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  lostDogMarkerContainer: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lostDogMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff3131',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  onlineMarker: {
    backgroundColor: '#4CAF50',
  },
  offlineMarker: {
    backgroundColor: '#757575',
  },
  unsafeMarker: {
    backgroundColor: '#FF5252',
  },
  dogMarkerImage: {
    width: 24,
    height: 24,
  },
  aggressiveIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 0, 0, 0.5)',
  },
  bottomMapControls: {
    position: 'absolute',
    flexDirection: 'row',
    bottom: 20,
    right: 20,
    justifyContent: 'space-between',
    width: 110, // Width for two buttons with spacing
  },
  bottomMapButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    backgroundColor: colors.yellow,
  },
  trackingActiveButton: {
    backgroundColor: '#ff3131', // Red when tracking is active
  },
  trackingInactiveButton: {
    backgroundColor: '#4CAF50', // Green when inactive
  },
  trackingIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFF00',
    borderWidth: 1,
    borderColor: 'white',
  },
  trackCountBadge: {
    position: 'absolute',
    bottom: 65,
    right: 25,
    backgroundColor: '#ff3131',
    borderRadius: 15,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
    paddingHorizontal: 5,
  },
  trackCountText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  detailedInfoContent: {
    flex: 1,
  },
  dogIconContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  infoSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  infoLabel: {
    width: '30%',
    fontWeight: 'bold',
    color: '#555',
  },
  infoValue: {
    width: '70%',
    color: '#333',
    flexWrap: 'wrap',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fff0f0',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff3131',
    alignItems: 'center',
  },
  warningText: {
    color: '#d32f2f',
    marginLeft: 10,
    flex: 1,
    flexWrap: 'wrap',
  },
  viewLostDogsButton: {
    position: 'absolute',
    bottom: 220, // Higher position to avoid overlapping with bottom buttons
    left: 20,
    right: 20,
    backgroundColor: '#ff3131',
    padding: 14,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    borderWidth: 1,
    borderColor: '#fff',
    zIndex: 999, // Ensure it appears above other elements
  },
  viewLostDogsText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 10,
    fontSize: 16,
  },
  deviceInfoContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  deviceInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  deviceInfoText: {
    fontSize: 12,
    color: '#555',
  },
  closeModalButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#2196F3',
    borderRadius: 20,
    elevation: 2,
  },
  closeModalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Additional styles for enhanced lost dog details
  lostTimeContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  lostTimeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff5252',
  },
  lostTimeValue: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statusIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 10,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 120,
    justifyContent: 'center',
  },
  statusOnline: {
    backgroundColor: '#4CAF50',
  },
  statusOffline: {
    backgroundColor: '#F44336',
  },
  statusRecent: {
    backgroundColor: '#2196F3',
  },
  statusOld: {
    backgroundColor: '#FF9800',
  },
  statusIndicatorText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 6,
  },
  deviceInfoBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  deviceInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceInfoContent: {
    marginLeft: 12,
    flex: 1,
  },
  deviceInfoLabel: {
    fontSize: 12,
    color: '#757575',
  },
  deviceInfoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
  },
  locationBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginLeft: 8,
  },
  locationAddress: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 10,
  },
  coordinatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  coordinatesLabel: {
    fontSize: 12,
    color: '#757575',
    marginRight: 8,
  },
  coordinatesValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#212121',
  },
  locationTimestamp: {
    fontSize: 11,
    color: '#9E9E9E',
    fontStyle: 'italic',
  },
  closeButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: '#ff5252',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusBoxText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default DogWalkingApp;