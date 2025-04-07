import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
  Image,
  FlatList,
} from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MapView, { Polyline, Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRouter } from 'expo-router';
import colors from '../../constants/colors';
import environments from '../../constants/enviroments';
import DogImage from '../../../assets/images/dog_pics.png';

const ActivityPathTracker = () => {
    const navigation = useNavigation();
    const router = useRouter();
    const [modalVisible, setModalVisible] = useState(false);
    const [recentWalks, setRecentWalks] = useState([]);
    const [activeWalk, setActiveWalk] = useState(null);
    const [selectedWalk, setSelectedWalk] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deviceId, setDeviceId] = useState(null);
    const [availableDevices, setAvailableDevices] = useState([]);
    const [deviceSelectorVisible, setDeviceSelectorVisible] = useState(false);
    const [activityStats, setActivityStats] = useState({
      totalMinutes: 0,
      goalMinutes: 60,
      avgMinutes: 0,
      calories: 0,
      stepsToday: 0,
    });
    const [mapType, setMapType] = useState('standard');
    const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);

  // Get authentication token
  const getToken = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return token;
    } catch (error) {
      console.error('Error retrieving token:', error);
      return null;
    }
  };
  
  const fetchAvailableDevices = async () => {
    try {
      const token = await getToken();
      if (!token) {
        console.log("No auth token found");
        return [];
      }

      const response = await fetch(`${environments.API_BASE_URL}/api/deviceData`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const rawText = await response.text(); // Read response as text first
      console.log("Raw API Response:", rawText);

      if (!response.ok) {
        console.error(`API Error! Status: ${response.status}, Response:`, rawText);
        return [];
      }

      let data;
      try {
        data = JSON.parse(rawText); // Now parse JSON safely
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        return [];
      }

      if (!Array.isArray(data)) {
        console.error("Unexpected API response format, expected an array.");
        return [];
      }

      const formattedDevices = data.map(device => ({
        id: device._id,
        name: device.animalName || device.deviceName || 'Unknown Device',
        isOffline: !device.gnssStatus,
      }));

      console.log("Formatted Devices:", formattedDevices); // Log all devices
      setAvailableDevices(formattedDevices); // Ensure all devices are set
      return formattedDevices;
    } catch (err) {
      console.error('Error fetching devices:', err);
      return [];
    }
  };
  // Initialize component - fetch devices and walks
  useEffect(() => {
    const initialize = async () => {
      try {
        const devices = await fetchAvailableDevices();
        setAvailableDevices(devices);
        console.log(`Found ${devices.length} devices`);
  
        const savedDeviceId = await AsyncStorage.getItem('selectedDeviceId');
        console.log("Fetched saved deviceId:", savedDeviceId);
  
        if (savedDeviceId && devices.some(device => device.id === savedDeviceId)) {
          const index = devices.findIndex(d => d.id === savedDeviceId);
          setCurrentDeviceIndex(index);
          setDeviceId(savedDeviceId);
          fetchWalkData(savedDeviceId);
        } else if (devices.length > 0) {
          const defaultDeviceId = devices[0].id;
          setCurrentDeviceIndex(0);
          setDeviceId(defaultDeviceId);
          await AsyncStorage.setItem('selectedDeviceId', defaultDeviceId);
          fetchWalkData(defaultDeviceId);
        } else {
          createStaticPathData();
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing:', err);
        createStaticPathData();
        setLoading(false);
      }
    };
  
    initialize();
  }, []);
  

  // Create static demo data when no real data is available
  const createStaticPathData = () => {
    const centerLat = 54.6892;
    const centerLng = 25.2798;
  
    const staticPath = {
      _id: 'static-path',
      device: 'static-device',
      deviceName: 'Demo Device',
      animalName: 'Demo Dog',
      startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      endTime: new Date().toISOString(),
      distance: 2.5,
      duration: 45,
      coordinates: [
        { latitude: centerLat, longitude: centerLng, timestamp: Date.now() - 3600000 },
        { latitude: centerLat + 0.005, longitude: centerLng + 0.003, timestamp: Date.now() - 3000000 },
        { latitude: centerLat + 0.008, longitude: centerLng + 0.001, timestamp: Date.now() - 2400000 },
        { latitude: centerLat + 0.006, longitude: centerLng - 0.004, timestamp: Date.now() - 1800000 },
        { latitude: centerLat + 0.001, longitude: centerLng - 0.007, timestamp: Date.now() - 1200000 },
        { latitude: centerLat - 0.003, longitude: centerLng - 0.005, timestamp: Date.now() - 600000 },
        { latitude: centerLat - 0.002, longitude: centerLng, timestamp: Date.now() }
      ],
      isActive: false
    };
  
    setSelectedWalk(staticPath);
    console.log("Static Device Name:", staticPath.deviceName);
  
    setActivityStats({
      totalMinutes: 45,
      goalMinutes: 60,
      avgMinutes: 40,
      calories: Math.round(45 * 15.5),
    });
  };

// ✅ FIX: Use last coordinate timestamp if endTime is missing
const fetchWalkData = async (deviceId) => {
  if (!deviceId) {
    console.error("Cannot fetch walk data: deviceId is null");
    return;
  }

  try {
    setLoading(true);

    const token = await getToken();
    if (!token) {
      console.log("No auth token");
      setLoading(false);
      return;
    }

    const response = await fetch(`${environments.API_BASE_URL}/api/deviceData/walks/${deviceId}?limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`HTTP error! Status: ${response.status}`);
      setLoading(false);
      return;
    }

    const data = await response.json();

    // Set active walk in state
    if (data.activeWalk) {
      setActiveWalk(data.activeWalk);
    }

    let recentWalks = data.recentWalks || [];

    // Include active walk at the top of the list (optional)
    if (data.activeWalk) {
      recentWalks = [data.activeWalk, ...recentWalks];
    }

    // Enrich walks with fallback endTime & duration
    const enrichedWalks = recentWalks.map((walk) => {
      if (!walk || !walk.coordinates || walk.coordinates.length === 0) return null;

      // Set fallback endTime if missing
      if (!walk.endTime) {
        walk.endTime = walk.coordinates[walk.coordinates.length - 1].timestamp;
      }

      // Calculate duration if missing
      if (!walk.duration && walk.coordinates.length > 1) {
        const start = new Date(walk.coordinates[0].timestamp);
        const end = new Date(walk.coordinates[walk.coordinates.length - 1].timestamp);
        walk.duration = Math.round((end - start) / 60000); // minutes
      }

      // Make sure endTime is a Date object
      walk.endTime = new Date(walk.endTime);

      return walk;
    }).filter(Boolean); // Remove any nulls

    // Sort walks by most recent end time
    const sortedWalks = enrichedWalks.sort((a, b) => b.endTime - a.endTime);

    // Pick the latest walk (active or finished)
    const mostRecentWalk = sortedWalks[0];

    // Update state
    setRecentWalks(sortedWalks);
    setSelectedWalk(mostRecentWalk);
    // Update state

    await calculateActivityStats(sortedWalks, data.activeWalk);


    // Optional: recalculate stats (if you want)
    // await calculateActivityStats(sortedWalks, data.activeWalk);
    // 📢 Log how many walks
  console.log(`🦮 Total Walks: ${sortedWalks.length}`);

  sortedWalks.forEach((walk, index) => {
    const distance = walk.distance?.toFixed(2) || '0';
    const duration = walk.duration || 0;
    const endTime = new Date(walk.endTime).toLocaleString();
    console.log(`➡️ Walk #${index + 1}: ${distance} km, ${duration} min, Ended at ${endTime}`);
  });


  } catch (err) {
    console.error('Complete fetch error:', err);
  } finally {
    setLoading(false);
  }
};


  // Change selected device and fetch its data
  const handleDeviceChange = async (newDeviceId, newIndex = null) => {
    try {
      console.log("Changing to device:", newDeviceId);
  
      // Reset old walk data right away
      setSelectedWalk(null);
      setRecentWalks([]);
      setActiveWalk(null);
      setLoading(true); // start loading right away
  
      setDeviceId(newDeviceId);
      
      if (newIndex !== null) {
        setCurrentDeviceIndex(newIndex);
      } else {
        const index = availableDevices.findIndex(d => d.id === newDeviceId);
        if (index !== -1) setCurrentDeviceIndex(index);
      }
  
      await AsyncStorage.setItem('selectedDeviceId', newDeviceId);
      setDeviceSelectorVisible(false);
  
      // Fetch fresh data for the new device
      await fetchWalkData(newDeviceId);
    } catch (err) {
      console.error('Error saving selected device:', err);
    }
  };
  

  const estimateSteps = (distanceKm, heightCm = 45) => {
    const strideLengthMeters = heightCm * 0.43 / 100;
    return Math.round((distanceKm * 1000) / strideLengthMeters);
  };
  
  const calculateActivityStats = async (walks, currentWalk) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
  
    let weightKg = 10;
    let heightCm = 45;
  
    try {
      const token = await AsyncStorage.getItem('authToken');
  
      // ✅ Fetch all animals
      const response = await fetch(`${environments.API_BASE_URL}/api/animals/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
  
      if (response.ok) {
        const animals = await response.json();
  
        // ✅ Find the one linked to the current deviceId
        const matchedAnimal = animals.find((animal) => {
          const linkedDeviceId = animal.device?._id || animal.device;
          return linkedDeviceId === deviceId;
        });
  
        if (matchedAnimal) {
          if (matchedAnimal.weight) weightKg = parseFloat(matchedAnimal.weight);
          if (matchedAnimal.height) heightCm = parseFloat(matchedAnimal.height);
  
          console.log('🐶 Matched Animal:', matchedAnimal.name || '(no name)', '→ Weight:', weightKg, 'kg, Height:', heightCm, 'cm');
        } else {
          console.warn('⚠️ No animal matched to this deviceId, using default height/weight');
        }
      } else {
        console.warn('⚠️ Failed to fetch animals, using default weight/height');
      }
    } catch (err) {
      console.warn('⚠️ Error fetching animals:', err);
    }
  
    // Filter today's walks
    const todayWalks = walks.filter((walk) => {
      const walkDate = new Date(walk.endTime);
      walkDate.setHours(0, 0, 0, 0);
      return walkDate.getTime() === today.getTime();
    });
  
    const totalMinutes = todayWalks.reduce((sum, walk) => sum + (walk.duration || 0), 0);
    const avgMinutes = todayWalks.length ? totalMinutes / todayWalks.length : 0;
  
    const calorieFactor = 0.75;
    const calories = Math.round(totalMinutes * weightKg * calorieFactor);
  
    let totalSteps = 0;
    todayWalks.forEach((walk) => {
      if (walk.distance) {
        totalSteps += estimateSteps(walk.distance, heightCm);
      }
    });
  
    console.log("🐕 Today's walks breakdown:");
    todayWalks.forEach((walk, index) => {
      console.log(`#${index + 1} — Duration: ${walk.duration} min, Distance: ${walk.distance} km`);
    });
  
    setActivityStats({
      totalMinutes: Math.round(totalMinutes),
      goalMinutes: 60,
      avgMinutes: Math.round(avgMinutes),
      calories,
      stepsToday: totalSteps,
    });
  
    console.log(`🟢 Today - Minutes: ${totalMinutes}, Avg: ${avgMinutes}, Calories: ${calories}, Steps: ${totalSteps}`);
  };
  
  

  const handleInfoPress = () => {
    setModalVisible(true);
  };

  const closeModalAndNavigateToActivityTab = () => {
    setModalVisible(false);
  };

  const selectWalk = (walk) => {
    setSelectedWalk(walk);
    console.log("Selected Device Name:", walk.deviceName);
  };

  const getActivityScore = () => {
    const percentOfGoal = Math.min(100, (activityStats.totalMinutes / activityStats.goalMinutes) * 100);
    return Math.round(percentOfGoal);
  };

  const getActivityStatus = () => {
    const score = getActivityScore();
    if (score >= 90) return { text: 'Excellent', color: colors.green };
    if (score >= 70) return { text: 'Good', color: colors.green };
    if (score >= 50) return { text: 'Doing well', color: colors.yellow };
    if (score >= 30) return { text: 'Needs more', color: '#FFA500' };
    return { text: 'Low activity', color: '#FF0000' };
  };

  const activityStatus = getActivityStatus();
  const activityScore = getActivityScore();

  const getMapRegion = () => {
    if (!selectedWalk || !selectedWalk.coordinates || selectedWalk.coordinates.length === 0) {
      console.log("No coordinates found, using default region.");
      return {
        latitude: 54.6892,
        longitude: 25.2798,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
  
    const coords = selectedWalk.coordinates;
    const lastCoord = coords[coords.length - 1];
  
    // If only one coordinate, create a small view around that point
    if (coords.length === 1) {
      return {
        latitude: lastCoord.latitude,
        longitude: lastCoord.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
  
    let minLat = coords[0].latitude;
    let maxLat = coords[0].latitude;
    let minLng = coords[0].longitude;
    let maxLng = coords[0].longitude;
  
    coords.forEach((coord) => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLng = Math.min(minLng, coord.longitude);
      maxLng = Math.max(maxLng, coord.longitude);
    });
  
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
  
    // Calculate deltas with a minimum size to ensure visibility
    const latDelta = Math.max((maxLat - minLat) * 1.5, 0.01);
    const lngDelta = Math.max((maxLng - minLng) * 1.5, 0.01);
  
    console.log("Map Region:", { 
      latitude: centerLat, 
      longitude: centerLng, 
      latitudeDelta: latDelta, 
      longitudeDelta: lngDelta 
    });
  
    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };
  const formatWalkDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleMapType = () => {
    const types = ['standard', 'satellite', 'hybrid'];
    const currentIndex = types.indexOf(mapType);
    const nextIndex = (currentIndex + 1) % types.length;
    setMapType(types[nextIndex]);
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0m';
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Updated renderWalkItem function
  const renderWalkItem = ({ item: walk }) => {
    const isSelected = selectedWalk && selectedWalk._id === walk._id;
    return (
      <TouchableOpacity
        style={[
          styles.walkTab,
          isSelected && styles.selectedWalkTab
        ]}
        onPress={() => selectWalk(walk)}
      >
        <Text style={styles.walkTabText}>
          {walk.isActive ? 'Active Walk' : formatWalkDate(walk.endTime)}
        </Text>
      </TouchableOpacity>
    );
  };
  const calculateBarHeights = (walks) => {
    const hourlyActivity = new Array(24).fill(0);
  
    walks.forEach((walk) => {
      if (walk.coordinates && walk.coordinates.length > 0) {
        const startTime = new Date(walk.coordinates[0].timestamp);
        const endTime = new Date(walk.coordinates[walk.coordinates.length - 1].timestamp);
  
        const startHour = startTime.getHours();
        const endHour = endTime.getHours();
        const duration = (endTime - startTime) / 60000; // in minutes
  
        for (let hour = startHour; hour <= endHour; hour++) {
          hourlyActivity[hour] += duration / (endHour - startHour + 1);
        }
      }
    });
  
    return hourlyActivity.map((minutes, hour) => ({ hour, minutes })).filter(item => item.minutes > 0);
  };
  
  
  
  const goToPreviousDevice = () => {
    if (currentDeviceIndex > 0) {
      const previousIndex = currentDeviceIndex - 1;
      handleDeviceChange(availableDevices[previousIndex].id, previousIndex);
    }
  };
  
  const goToNextDevice = () => {
    if (currentDeviceIndex < availableDevices.length - 1) {
      const nextIndex = currentDeviceIndex + 1;
      handleDeviceChange(availableDevices[nextIndex].id, nextIndex);
    }
  };

  // Get the current device name
  const getCurrentDeviceName = () => {
    const currentDevice = availableDevices[currentDeviceIndex];
    return currentDevice ? currentDevice.name : 'Unknown Device';
  };

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={goToPreviousDevice}
            disabled={currentDeviceIndex === 0}
            style={[styles.arrowButton, currentDeviceIndex === 0 && styles.disabledArrow]}
          >
            <FontAwesome name="chevron-left" size={20} color={colors.yellow} />
          </TouchableOpacity>
  
          <View style={styles.headerCenter}>
            <Text style={styles.headerText}>{getCurrentDeviceName()} Wellness</Text>
          </View>
  
          <TouchableOpacity
            onPress={goToNextDevice}
            disabled={currentDeviceIndex === availableDevices.length - 1}
            style={[styles.arrowButton, currentDeviceIndex === availableDevices.length - 1 && styles.disabledArrow]}
          >
            <FontAwesome name="chevron-right" size={20} color={colors.yellow} />
          </TouchableOpacity>
        </View>
  
        <Modal
          transparent={true}
          visible={deviceSelectorVisible}
          animationType="slide"
          onRequestClose={() => setDeviceSelectorVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setDeviceSelectorVisible(false)}
          >
            <View style={styles.deviceSelectorContainer}>
              <Text style={styles.deviceSelectorTitle}>Select Device</Text>
              {availableDevices.map((device) => (
                <TouchableOpacity
                  key={device.id}
                  style={[
                    styles.deviceOption,
                    deviceId === device.id && styles.selectedDeviceOption
                  ]}
                  onPress={() => handleDeviceChange(device.id)}
                >
                  <Text style={styles.deviceOptionText}>
                    {device.name} {device.isOffline ? '(Offline)' : ''}
                  </Text>
                  {deviceId === device.id && (
                    <FontAwesome name="check" size={16} color={colors.yellow} />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.closeDeviceSelectorButton}
                onPress={() => setDeviceSelectorVisible(false)}
              >
                <Text style={styles.closeButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
  
        <View style={styles.wellnessCard}>
          <View style={styles.row}>
            <View style={styles.Imagecontainer}>
              <Image source={DogImage} style={styles.profileImage} />
            </View>
            <View style={styles.scoreContainer}>
              <Text style={styles.score}>{activityScore}</Text>
              <Text style={styles.status}>{activityStatus.text}</Text>
            </View>
            <TouchableOpacity onPress={handleInfoPress} style={styles.infoIcon}>
              <FontAwesome6 name="circle-info" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.activityRow}>
            <Text style={styles.activityLabel}>Activity</Text>
            <View style={styles.activityStatus}>
              <View style={[styles.statusDot, { backgroundColor: activityStatus.color }]} />
              <Text style={styles.activityStatusText}>{activityStatus.text}</Text>
            </View>
          </View>
        </View>
  
        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <Text style={styles.minutesText}>
              {activityStats.totalMinutes}/{activityStats.goalMinutes} min
            </Text>
          </View>
          <View style={styles.barGraphWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Bar Graph Row */}
              <View style={styles.barGraphRow}>
                {[...Array(24).keys()].map((hour) => {
                  const bar = calculateBarHeights(recentWalks).find((item) => item.hour === hour);
                  return (
                    <View key={hour} style={styles.barColumn}>
                      <View
                        style={[
                          styles.bar,
                          { height: bar ? Math.min(80, bar.minutes * 2) : 0 }
                        ]}
                      />
                    </View>
                  );
                })}
              </View>

              {/* Axis Line & Labels */}
              <View style={styles.axisContainer}>
                <View style={styles.axisLine} />
                <View style={styles.axisLabelsRow}>
                  {[...Array(24).keys()].map((hour) => (
                    <Text key={hour} style={styles.axisLabel}>
                      {hour}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>



          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Avg Minutes</Text>
              <Text style={styles.statValue}>{activityStats.avgMinutes} min</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Calories</Text>
              <Text style={styles.statValue}>{activityStats.calories} kcal</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Steps</Text>
              <Text style={styles.statValue}>{activityStats.stepsToday}</Text>
            </View>
          </View>
        </View>
  
        <Text style={styles.sectionTitle}>Animal Tracks: Follow the Paw Journey!</Text>
  
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.yellow} />
            <Text style={styles.loadingText}>Loading walk data...</Text>
          </View>
        ) : (
          <>
            {selectedWalk ? (
              <View style={styles.walkDetails}>
                <View style={styles.mapContainer}>
                  <MapView
                    style={styles.map}
                    region={getMapRegion()}
                    mapType={mapType}
                  >
                    {selectedWalk.coordinates && selectedWalk.coordinates.length > 0 && (
                      <>
                        <Polyline
                          coordinates={selectedWalk.coordinates}
                          strokeColor={colors.yellow}
                          strokeWidth={4}
                        />
                        <Marker
                          coordinate={selectedWalk.coordinates[0]}
                          title="Start"
                        >
                          <FontAwesome name="flag" size={24} color="green" />
                        </Marker>
                        {!selectedWalk.isActive && (
                          <Marker
                            coordinate={selectedWalk.coordinates[selectedWalk.coordinates.length - 1]}
                            title="End"
                          >
                            <FontAwesome name="flag-checkered" size={24} color="red" />
                          </Marker>
                        )}
                      </>
                    )}
                  </MapView>
                  <TouchableOpacity style={styles.mapTypeButton} onPress={toggleMapType}>
                    <FontAwesome6 name="map" size={20} color={colors.white} />
                  </TouchableOpacity>
                </View>
                <View style={styles.walkStatsRow}>
                  <View style={styles.walkStat}>
                    <Text style={styles.walkStatLabel}>Distance</Text>
                    <Text style={styles.walkStatValue}>
                      {selectedWalk.distance ? selectedWalk.distance.toFixed(2) : '0'} km
                    </Text>
                  </View>
                  <View style={styles.walkStat}>
                    <Text style={styles.walkStatLabel}>Duration</Text>
                    <Text style={styles.walkStatValue}>
                      {formatDuration(selectedWalk.duration)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noWalksContainer}>
                <Text style={styles.noWalksText}>No walks recorded yet</Text>
              </View>
            )}
          </>
        )}
  
        <View style={styles.recentWalksContainer}>
          <TouchableOpacity
            style={styles.firstButton}
            onPress={() => router.push('/screens/ActivityTab/ActivityHistory')}
            testID="firstButton"
          >
            <Text style={styles.buttonText}>History of Walks</Text>
            <FontAwesome6 name="arrow-right" size={16} color={colors.yellow} style={styles.arrowIcon} />
          </TouchableOpacity>
        </View>
  
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Activity Score</Text>
                <Pressable onPress={() => setModalVisible(false)} style={styles.closeButton}>
                  <FontAwesome name="close" size={20} color={colors.yellow} />
                </Pressable>
              </View>
              <Text style={styles.modalSubheader}>How it's calculated</Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactText}>
                  Your activity score is based on total daily minutes compared to your goal (60 min), and past 7-day averages.
                </Text>
                <Text style={styles.contactText}>
                  Staying consistent helps boost your pet’s wellness!
                </Text>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: colors.lightGray,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  
  arrowButton: {
    padding: 10,
    opacity: 1,
  },
  
  disabledArrow: {
    opacity: 0.3,
  },
  
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  
  headerText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.black,
  },
  wellnessCard: {
    backgroundColor: colors.yellow,
    borderRadius: 16,
    padding: 16,
    marginBottom: 13,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  Imagecontainer: {
    width: 65,
    height: 65,
    borderRadius: 50,
    marginRight: 12,
    backgroundColor: colors.black,
    marginTop: 5,
    borderWidth: 8,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 25,
  },
  infoIcon: {
    marginLeft: 'auto',
    alignContent: 'flex-start',
  },
  scoreContainer: {
    justifyContent: 'center',
    marginTop: 5,
  },
  score: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.black,
  },
  status: {
    fontSize: 16,
    color: colors.black,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderColor: colors.black,
    borderWidth: 1,
  },
  activityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.black,
    marginBottom: 2,
  },
  activityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    backgroundColor: colors.green,
    borderRadius: 4,
    marginRight: 6,
  },
  activityStatusText: {
    fontSize: 16,
    color: colors.black,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.black,
    textAlign: 'center',
    marginBottom: 10,
  },
  activityCard: {
    backgroundColor: colors.yellow,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 10,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  minutesText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.black,
  },
  
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 7,
    marginTop: 20,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    borderColor: colors.black,
    borderWidth: 1,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingVertical: 5,
  },
  statLabel: {
    fontSize: 13,
    color: colors.yellow,
    paddingBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '650',
    color: colors.black,
  },
  barGraphWrapper: {
    backgroundColor: colors.yellow,
    paddingTop: 10,
    paddingBottom: 2,
    borderRadius: 12,
  },
  
  barGraphRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 90,
    paddingHorizontal: 4,
  },
  
  barColumn: {
    width: 16, // bar width
    alignItems: 'center',
    marginHorizontal: 2,
  },
  
  bar: {
    width: 14,
    backgroundColor: colors.white,
    borderRadius: 2,
  },
  
  axisContainer: {
    marginTop: 6,
  },
  
  axisLine: {
    height: 1.5,
    backgroundColor: colors.black,
    width: '100%',
    marginBottom: 4,
  },
  
  axisLabelsRow: {
    flexDirection: 'row',
  },
  
  axisLabel: {
    width: 20,
    textAlign: 'center',
    fontSize: 10,
    color: colors.black,
  },
  
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: colors.black,
  },
  walkTabs: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  walkTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.black,
  },
  selectedWalkTab: {
    backgroundColor: colors.yellow,
  },
  walkTabText: {
    fontSize: 12,
    color: colors.black,
  },
  walkDetails: {
    marginBottom: 15,
  },
  walkStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  walkStat: {
    alignItems: 'center',
    backgroundColor: colors.yellow,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 40,
    borderWidth: 1,
    borderColor: colors.black,
    fontWeight: '600',
  },
  walkStatLabel: {
    fontSize: 13,
    color: colors.white,
  },
  walkStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
  },
  mapContainer: {
    height: 200,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.black,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  noDataContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
  },
  noDataText: {
    fontSize: 16,
    color: colors.black,
  },
  noWalksContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.black,
  },
  noWalksText: {
    fontSize: 16,
    color: colors.black,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
    marginBottom: 10,
  },
  closeButton: {
    position: 'absolute',
    right: -5,
    top: -13,
    padding: 10,
  },
  modalSubheader: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  contactInfo: {
    alignItems: 'flex-start',
    width: '100%',
    backgroundColor: colors.yellow,
    borderRadius: 10,
    padding: 18,
    marginHorizontal: 10,
  },
  contactText: {
    fontSize: 16,
    lineHeight: 24,
  },
  
  infoBox: {
    backgroundColor: colors.yellow,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  infoHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: colors.black,
  },
  recentWalksContainer: {
    alignItems: 'center', // Center the content horizontally
    justifyContent: 'center', // Center the content vertically (optional)
  },

  firstButton: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 15,
    marginBottom: 10,
    width: '85%', // Adjust the width as needed
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.black,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  buttonText: {
    color: colors.black,
    fontSize: 16,
    paddingBottom: 1,
  },
});

export default ActivityPathTracker;