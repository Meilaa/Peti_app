import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from 'expo-router';
import colors from '../../constants/colors';
import environments from '../../constants/enviroments';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

// Responsive font size function
const normalize = (size) => {
  const scale = width / 375; // 375 is standard iPhone width
  const newSize = size * scale;
  return Math.round(newSize);
};

const ActivityHistory = () => {
  const navigation = useNavigation();
  const [availableDevices, setAvailableDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [walkHistory, setWalkHistory] = useState([]);
  const [selectedWalk, setSelectedWalk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [walkDates, setWalkDates] = useState({});


  const getToken = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return token;
    } catch (err) {
      console.error('Error getting token:', err);
      return null;
    }
  };

  const fetchDevices = async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${environments.API_BASE_URL}/api/deviceData`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      const devices = data.map((d) => ({
        id: d._id,
        name: d.animalName || d.deviceName || 'Unnamed',
      }));
      setAvailableDevices(devices);
      if (devices.length > 0) {
        setDeviceId(devices[0].id);
        fetchWalkHistory(devices[0].id, selectedDate);
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  };
  const fetchWalkHistory = async (deviceId, date) => {
    setLoading(true);
    const token = await getToken();
    try {
      const formattedDate = new Date(date).toISOString().split('T')[0];
      const res = await fetch(`${environments.API_BASE_URL}/api/deviceData/walks/${deviceId}?date=${formattedDate}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
  
      const allWalks = (data.activeWalk ? [data.activeWalk] : []).concat(data.recentWalks || []);
  
      // Build object of all walk dates to mark in calendar
      const datesWithWalks = {};
      allWalks.forEach(walk => {
        const dateStr = new Date(walk.startTime).toISOString().split('T')[0];
        datesWithWalks[dateStr] = {
          marked: true,
          dotColor: colors.black, // customize dot color here
        };
      });
  
      // Also add selected date styling
      const selectedStr = new Date(selectedDate).toISOString().split('T')[0];
      datesWithWalks[selectedStr] = {
        ...(datesWithWalks[selectedStr] || {}),
        selected: true,
        selectedColor: colors.black,
      };
  
      setWalkDates(datesWithWalks);
  
      // Filter walks for the selected date
      const filteredWalks = allWalks.filter(walk => {
        const walkDate = new Date(walk.startTime).toISOString().split('T')[0];
        return walkDate === formattedDate;
      });
  
      setWalkHistory(filteredWalks);
      setSelectedWalk(filteredWalks.length > 0 ? filteredWalks[0] : null);
    } catch (err) {
      console.error('Error fetching walk history:', err);
    } finally {
      setLoading(false);
    }
  };
  

  const calculateDuration = (start, end) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
  
    if (isNaN(startTime) || isNaN(endTime)) return 0;
  
    const durationMs = endTime - startTime;
  
    // Ignore invalid or extreme durations (e.g. more than 24 hours)
    if (durationMs > 24 * 60 * 60 * 1000 || durationMs < 0) return 0;
  
    return Math.round(durationMs / (1000 * 60)); // minutes
  };
  
  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (deviceId) {
      fetchWalkHistory(deviceId, selectedDate);
    }
  }, [selectedDate, deviceId]);

  const goToPreviousDevice = () => {
    if (currentDeviceIndex > 0) {
      const newIndex = currentDeviceIndex - 1;
      setCurrentDeviceIndex(newIndex);
      const newDevice = availableDevices[newIndex];
      setDeviceId(newDevice.id);
      fetchWalkHistory(newDevice.id, selectedDate);
    }
  };

  const goToNextDevice = () => {
    if (currentDeviceIndex < availableDevices.length - 1) {
      const newIndex = currentDeviceIndex + 1;
      setCurrentDeviceIndex(newIndex);
      const newDevice = availableDevices[newIndex];
      setDeviceId(newDevice.id);
      fetchWalkHistory(newDevice.id, selectedDate);
    }
  };

  const getMapRegion = () => {
    if (!selectedWalk || !selectedWalk.coordinates || selectedWalk.coordinates.length === 0) {
      return {
        latitude: 54.6892,
        longitude: 25.2798,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    const coords = selectedWalk.coordinates;
    const centerLat = (coords[0].latitude + coords[coords.length - 1].latitude) / 2;
    const centerLng = (coords[0].longitude + coords[coords.length - 1].longitude) / 2;
    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  };

  return (
    <View style={styles.container}>
        <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>
          </View>

      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={goToPreviousDevice}
          disabled={currentDeviceIndex === 0}
          style={[styles.arrowButton, currentDeviceIndex === 0 && styles.disabledArrow]}
        >
          <FontAwesome name="chevron-left" size={20} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerText}>
          {availableDevices[currentDeviceIndex]?.name || 'Device'} History
        </Text>
        <TouchableOpacity
          onPress={goToNextDevice}
          disabled={currentDeviceIndex === availableDevices.length - 1}
          style={[styles.arrowButton, currentDeviceIndex === availableDevices.length - 1 && styles.disabledArrow]}
        >
          <FontAwesome name="chevron-right" size={20} color={colors.black} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => setShowDatePicker(!showDatePicker)}
        style={styles.datePickerButton}
      >
        <Text style={styles.datePickerText}>📅 {selectedDate.toDateString()}</Text>
      </TouchableOpacity>

      {showDatePicker && (
        <Calendar
            onDayPress={(day) => {
              setSelectedDate(new Date(day.dateString));
              setShowDatePicker(false);
            }}
            markedDates={walkDates}
            style={{ borderRadius: 10, marginBottom: 16 }}
          />
          
          )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.black} />
      ) : walkHistory.length > 0 ? (
        <ScrollView>
          {walkHistory.map((walk, index) => (
            <TouchableOpacity 
              key={walk._id} 
              style={[
                styles.walkTab, 
                selectedWalk?._id === walk._id && styles.selectedWalkTab
              ]}
              onPress={() => setSelectedWalk(walk)}
            >
              <Text style={[
                styles.walkTabText, 
                selectedWalk?._id === walk._id && styles.selectedWalkTabText
              ]}>
                {new Date(walk.startTime).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}

          {selectedWalk && (
            <View>
              <View style={styles.mapContainer}>
                <MapView style={styles.map} region={getMapRegion()}>
                  <Polyline coordinates={selectedWalk.coordinates} strokeColor={colors.yellow} strokeWidth={4} />
                  <Marker coordinate={selectedWalk.coordinates[0]} title="Start" />
                  <Marker
                    coordinate={selectedWalk.coordinates[selectedWalk.coordinates.length - 1]}
                    title="End"
                  />
                </MapView>
              </View>
              <Text style={styles.walkInfo}>
                Distance: {selectedWalk.distance?.toFixed(2)} km
              </Text>
              <Text style={styles.walkInfo}>
                Duration: {calculateDuration(
                  selectedWalk.startTime,
                  selectedWalk.endTime || selectedWalk.coordinates?.[selectedWalk.coordinates.length - 1]?.timestamp || new Date()
                )} min
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <Text style={styles.noDataText}>No walks on this date</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.yellow,
    padding: width * 0.04,
  },
  backArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: height * 0.02,
    borderRadius: 50,
    backgroundColor: colors.white,
    width: width * 0.12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: height * 0.02,
    marginTop: Platform.OS === 'ios' ? height * 0.08 : height * 0.07,
  },
  backButton: {
    padding: width * 0.025,
    marginRight: width * 0.02,
  },
  arrowButton: {
    padding: width * 0.025,
  },
  disabledArrow: {
    opacity: 0.3,
  },
  headerText: {
    fontSize: normalize(22),
    fontWeight: '600',
    color: colors.black,
  },
  datePickerButton: {
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.04,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.black,
    marginBottom: height * 0.015,
    alignSelf: 'center',
  },
  datePickerText: {
    fontSize: normalize(16),
    fontWeight: '600',
    color: colors.black,
  },
  mapContainer: {
    height: height * 0.25,
    marginBottom: height * 0.025,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.black,
    marginTop: height * 0.012,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  walkTab: {
    paddingHorizontal: width * 0.03,
    paddingVertical: height * 0.01,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.black,
    marginHorizontal: width * 0.01,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: height * 0.002,
  },  
  walkTabText: {
    fontSize: normalize(12),
    color: colors.black,
  },
  selectedWalkTab: {
    backgroundColor: colors.black,
  },
  selectedWalkTabText: {
    color: colors.yellow,
  },
  noDataText: {
    fontSize: normalize(16),
    color: colors.black,
    textAlign: 'center',
    marginVertical: height * 0.025,
  },
  walkInfo: {
    fontSize: normalize(16),
    fontWeight: '500',
    color: colors.black,
    textAlign: 'center',
    marginBottom: height * 0.01,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    position: 'absolute',
    top: Platform.OS === 'ios' ? height * 0.05 : height * 0.03,
    left: width * 0.03,
  },
  button: {
    backgroundColor: colors.black,
    paddingVertical: height * 0.006,
    paddingHorizontal: width * 0.025,
    borderRadius: 40,
    width: '30%',
  },
  buttonText: {
    color: colors.yellow,
    fontSize: normalize(16),
    fontWeight: '400',
    textAlign: 'center',
    paddingBottom: 2,
  },
});

export default ActivityHistory;