import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polygon } from 'react-native-maps';
import { MaterialIcons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import colors from '../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import environments from '../../constants/enviroments';

// Simple fallback component for the picker if not available
const SimplePicker = ({ selectedValue, onValueChange, items }) => {
  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.selectedValueText}>Selected: {selectedValue}</Text>
      <View style={styles.optionsContainer}>
        {items.map(item => (
          <TouchableOpacity 
            key={item.value} 
            style={[
              styles.pickerOption,
              selectedValue === item.value && styles.pickerOptionSelected
            ]}
            activeOpacity={0.8}
            onPress={() => onValueChange(item.value)}
          >
            <Text style={[
              styles.pickerOptionText,
              selectedValue === item.value && styles.pickerOptionTextSelected
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const DangerZone = () => {
  const router = useRouter();
  // State for danger zones
  const [dangerZones, setDangerZones] = useState([]);
  const [currentDangerZone, setCurrentDangerZone] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [animals, setAnimals] = useState([]);
  const [apiStatus, setApiStatus] = useState('checking'); // 'checking', 'online', 'offline'
  
  // State for danger zone drawing
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dangerType, setDangerType] = useState('highway');
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  
  // Map state
  const [mapRegion, setMapRegion] = useState({
    latitude: 54.6892,
    longitude: 25.2798,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Add state for instruction overlay
  const [showInstructions, setShowInstructions] = useState(true);

  // Add state for saving
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    checkApiStatus();
    loadAnimals();
    loadDangerZones();
  }, []);

  const getToken = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return token;
    } catch (error) {
      console.error('Error retrieving token:', error);
      return null;
    }
  };

  // Check API connectivity status
  const checkApiStatus = async () => {
    setApiStatus('checking');
    
    for (const apiUrl of environments.API_URLS) {
      try {
        const response = await fetch(`${apiUrl}/api/danger-zones/test`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          timeout: 3000
        });
        
        if (response.ok) {
          console.log(`✅ API connection successful on ${apiUrl}`);
          setApiStatus('online');
          // Save working API URL to AsyncStorage
          await AsyncStorage.setItem('workingApiUrl', apiUrl);
          return apiUrl;
        }
      } catch (error) {
        console.log(`❌ API connection failed on ${apiUrl}: ${error.message}`);
      }
    }
    
    // All API URLs failed
    setApiStatus('offline');
    console.log('❌ All API connections failed, working offline');
    return null;
  };

  // Try all API endpoints in sequence
  const fetchWithMultipleEndpoints = async (endpoint, options) => {
    try {
      const apiUrl = environments.API_BASE_URL || 'http://localhost:3001';
      console.log(`📡 Fetching from: ${apiUrl}${endpoint}`);
      
      const response = await fetch(`${apiUrl}${endpoint}`, options);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ API request successful');
      return data;
    } catch (error) {
      console.error(`API fetch error:`, error);
      throw error;
    }
  };

  const loadAnimals = async () => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetchWithMultipleEndpoints('/api/animals', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // response is already parsed from fetchWithMultipleEndpoints
      console.log('🐾 Loaded animals:', response.length);
      setAnimals(response);
      
      if (response.length > 0) {
        setSelectedAnimal(response[0]._id);
      }
    } catch (error) {
      console.error('Error fetching animals:', error);
      Alert.alert('Error', 'Failed to load animals. Working offline.');
      
      // Try to load from AsyncStorage
      try {
        const savedAnimals = await AsyncStorage.getItem('animals');
        if (savedAnimals) {
          const parsedAnimals = JSON.parse(savedAnimals);
          console.log('📱 Loaded animals from AsyncStorage:', parsedAnimals.length);
          setAnimals(parsedAnimals);
          
          if (parsedAnimals.length > 0) {
            setSelectedAnimal(parsedAnimals[0]._id);
          }
        }
      } catch (e) {
        console.error('Error loading animals from AsyncStorage:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDangerZones = async () => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No token found');
      }

      console.log('📡 Fetching danger zones...');
      
      const response = await fetchWithMultipleEndpoints('/api/danger-zones', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // response is already parsed from fetchWithMultipleEndpoints
      console.log('⚠️ Loaded danger zones:', response.length);
      setDangerZones(response);
      
      // Save danger zones to AsyncStorage as backup
      await AsyncStorage.setItem('dangerZones', JSON.stringify(response));
    } catch (error) {
      console.error('Error fetching danger zones:', error);
      
      // Try to load from AsyncStorage if API fails
      try {
        console.log('⚠️ API failed, loading danger zones from local storage');
        const savedDangerZones = await AsyncStorage.getItem('dangerZones');
        if (savedDangerZones) {
          const parsedDangerZones = JSON.parse(savedDangerZones);
          console.log('📱 Loaded danger zones from AsyncStorage:', parsedDangerZones.length);
          setDangerZones(parsedDangerZones);
        }
      } catch (e) {
        console.error('Error loading from AsyncStorage:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setPoints([]);
    setShowInstructions(false);
  };

  const handleMapPress = (event) => {
    if (isDrawing) {
      setPoints([...points, event.nativeEvent.coordinate]);
    }
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setPoints([]);
  };

  const finishDrawing = () => {
    if (points.length < 4) {
      Alert.alert('Error', 'A danger zone must have at least 4 points');
      return;
    }
    
    setModalVisible(true);
  };

  const saveDangerZone = async () => {
    if (!name) {
      Alert.alert('Error', 'Please enter a name for the danger zone');
      return;
    }
    
    if (!selectedAnimal) {
      Alert.alert('Error', 'Please select an animal for the danger zone');
      return;
    }
    
    if (points.length < 4) {
      Alert.alert('Error', 'A danger zone must have at least 4 points');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No token found');
      }
      
      // Format the coordinates for the API
      const formattedCoords = points.map(point => ({
        latitude: point.latitude,
        longitude: point.longitude
      }));
      
      // Find the selected animal to ensure we have valid data
      const selectedAnimalObj = animals.find(a => a._id === selectedAnimal);
      if (!selectedAnimalObj) {
        console.error('Cannot find selected animal with ID:', selectedAnimal);
      } else {
        console.log('Found selected animal:', selectedAnimalObj.name);
      }
      
      // Make sure we store animal ID as a string value, not an object
      const dangerZoneData = {
        name,
        description,
        dangerType,
        coordinates: formattedCoords,
        animal: selectedAnimal,  // Store as string ID
        animalId: selectedAnimal // Store as string ID
      };
      
      console.log('Saving danger zone with animal ID:', selectedAnimal);
      console.log('Danger zone data:', JSON.stringify(dangerZoneData, null, 2));
      
      // Find the animal name for logging
      const animalName = animals.find(a => a._id === selectedAnimal)?.name || 'Unknown';
      console.log('Animal name for this danger zone:', animalName);
      
      // If we're editing an existing danger zone
      if (currentDangerZone) {
        const response = await fetchWithMultipleEndpoints(`/api/danger-zones/${currentDangerZone._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dangerZoneData)
        });
        
        console.log(`✅ Danger zone updated: ${response._id}`);
        console.log('Server response:', JSON.stringify(response, null, 2));
        
        // Update the local list
        setDangerZones(prevZones => {
          const updatedZones = prevZones.map(zone => 
            zone._id === response._id ? response : zone
          );
          // Save to AsyncStorage
          AsyncStorage.setItem('dangerZones', JSON.stringify(updatedZones));
          
          // Set a flag to notify the Home.js component to update
          AsyncStorage.setItem('dangerZonesUpdated', 'true');
          AsyncStorage.setItem('dangerZonesLastUpdated', new Date().toISOString());
          
          return updatedZones;
        });
      } else {
        // Creating a new danger zone
        const response = await fetchWithMultipleEndpoints('/api/danger-zones', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dangerZoneData)
        });
        
        console.log(`✅ New danger zone created: ${response._id}`);
        console.log('Server response:', JSON.stringify(response, null, 2));
        
        // Add to the local list
        setDangerZones(prevZones => {
          const updatedZones = [...prevZones, response];
          // Save to AsyncStorage
          AsyncStorage.setItem('dangerZones', JSON.stringify(updatedZones));
          
          // Set a flag to notify the Home.js component to update
          AsyncStorage.setItem('dangerZonesUpdated', 'true');
          AsyncStorage.setItem('dangerZonesLastUpdated', new Date().toISOString());
          
          return updatedZones;
        });
      }
      
      // Reset form and drawing state
      setModalVisible(false);
      setIsDrawing(false);
      setPoints([]);
      setName('');
      setDescription('');
      setDangerType('highway');
      setCurrentDangerZone(null);
      
      Alert.alert('Success', currentDangerZone
        ? 'Danger zone updated successfully'
        : 'New danger zone created successfully'
      );
    } catch (error) {
      console.error('Error saving danger zone:', error);
      Alert.alert('Error', 'Failed to save danger zone. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDangerZone = async (dangerZone) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete the danger zone "${dangerZone.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              if (!token) {
                throw new Error('No token found');
              }
              
              const response = await fetchWithMultipleEndpoints(`/api/danger-zones/${dangerZone._id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              console.log(`✅ Danger zone deleted: ${dangerZone._id}`);
              
              // Remove from the local list
              setDangerZones(prevZones => {
                const updatedZones = prevZones.filter(zone => zone._id !== dangerZone._id);
                // Save to AsyncStorage
                AsyncStorage.setItem('dangerZones', JSON.stringify(updatedZones));
                return updatedZones;
              });
              
              Alert.alert('Success', 'Danger zone deleted successfully');
            } catch (error) {
              console.error('Error deleting danger zone:', error);
              Alert.alert('Error', 'Failed to delete danger zone. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Get danger type icon
  const getDangerTypeIcon = (type) => {
    switch (type) {
      case 'highway':
        return <FontAwesome5 name="road" size={20} color="#fff" />;
      case 'river':
        return <FontAwesome5 name="water" size={20} color="#fff" />;
      case 'wildlife':
        return <FontAwesome5 name="paw" size={20} color="#fff" />;
      case 'cliff':
        return <FontAwesome5 name="mountain" size={20} color="#fff" />;
      case 'road':
        return <FontAwesome5 name="car" size={20} color="#fff" />;
      default:
        return <FontAwesome5 name="exclamation-triangle" size={20} color="#fff" />;
    }
  };

  // Get color for danger type
  const getDangerTypeColor = (type) => {
    switch (type) {
      case 'highway':
        return 'rgba(255, 0, 0, 0.7)';
      case 'river':
        return 'rgba(0, 0, 255, 0.7)';
      case 'wildlife':
        return 'rgba(139, 69, 19, 0.7)';
      case 'cliff':
        return 'rgba(128, 128, 128, 0.7)';
      case 'road':
        return 'rgba(255, 165, 0, 0.7)';
      default:
        return 'rgba(255, 0, 0, 0.7)';
    }
  };

  const viewDangerZone = (dangerZone) => {
    setCurrentDangerZone(dangerZone);
    const region = getRegionForCoordinates(dangerZone.coordinates);
    setMapRegion(region);
  };

  const renderDangerZoneItem = ({ item }) => {
    // Debug the item structure
    console.log('Danger zone item:', JSON.stringify(item, null, 2));
    
    // Fix animal name lookup to be more robust
    let animalName = 'Unknown animal';
    
    // First check if the animal is a string ID
    if (typeof item.animal === 'string') {
      const matchedAnimal = animals.find(animal => animal._id === item.animal);
      if (matchedAnimal && matchedAnimal.name) {
        animalName = matchedAnimal.name;
      }
    } 
    // If animal is an object with _id 
    else if (item.animal && item.animal._id) {
      const matchedAnimal = animals.find(animal => animal._id === item.animal._id);
      if (matchedAnimal && matchedAnimal.name) {
        animalName = matchedAnimal.name;
      }
    }
    
    // If still unknown, try with animalId
    if (animalName === 'Unknown animal' && item.animalId) {
      const matchedAnimal = animals.find(animal => animal._id === item.animalId);
      if (matchedAnimal && matchedAnimal.name) {
        animalName = matchedAnimal.name;
      }
    }
    
    // Log debugging info
    console.log(`Rendering danger zone for animal: ${animalName}, ID type: ${typeof item.animal}, animal data: ${JSON.stringify(item.animal || item.animalId)}`);
    
    return (
      <View style={styles.territoryItem}>
        <View style={styles.territoryItemContent}>
          <View style={styles.territoryDetails}>
            <Text style={styles.territoryName}>{item.name}</Text>
            <Text style={styles.territoryInfo}>{animalName}</Text>
            <View style={styles.dangerTypeTag}>
              {getDangerTypeIcon(item.dangerType)}
              <Text style={styles.dangerTypeText}>{item.dangerType.charAt(0).toUpperCase() + item.dangerType.slice(1)}</Text>
            </View>
          </View>
          <View style={styles.territoryActions}>
            <TouchableOpacity 
              onPress={() => viewDangerZone(item)} 
              activeOpacity={0.8}
              style={styles.actionButton}
            >
              <MaterialIcons name="visibility" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => deleteDangerZone(item)} 
              activeOpacity={0.8}
              style={styles.actionButton}
            >
              <MaterialIcons name="delete" size={24} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const getRegionForCoordinates = (coordinates) => {
    // Calculate the bounding box for the coordinates
    if (!coordinates || coordinates.length === 0) {
      return mapRegion;
    }

    let minLat = coordinates[0].latitude;
    let maxLat = coordinates[0].latitude;
    let minLng = coordinates[0].longitude;
    let maxLng = coordinates[0].longitude;

    coordinates.forEach((coord) => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLng = Math.min(minLng, coord.longitude);
      maxLng = Math.max(maxLng, coord.longitude);
    });

    const latDelta = (maxLat - minLat) * 1.5;
    const lngDelta = (maxLng - minLng) * 1.5;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(latDelta, 0.02),
      longitudeDelta: Math.max(lngDelta, 0.02),
    };
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            activeOpacity={0.8}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Danger Zone Alerts</Text>
          {apiStatus === 'checking' && <ActivityIndicator size="small" color={colors.primary} />}
          {apiStatus === 'online' && <MaterialIcons name="cloud-done" size={24} color={colors.success} />}
          {apiStatus === 'offline' && <MaterialIcons name="cloud-off" size={24} color={colors.danger} />}
        </View>

        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={mapRegion}
            onPress={handleMapPress}
            showsUserLocation={true}
          >
            {/* Show existing danger zones */}
            {dangerZones.map((zone) => (
              <Polygon
                key={zone._id}
                coordinates={zone.coordinates}
                fillColor={getDangerTypeColor(zone.dangerType)}
                strokeColor="red"
                strokeWidth={2}
                tappable={true}
                onPress={() => viewDangerZone(zone)}
              />
            ))}

            {/* Show the current drawing points */}
            {isDrawing && points.length > 0 && (
              <Polygon
                coordinates={points}
                fillColor="rgba(255, 0, 0, 0.3)"
                strokeColor="red"
                strokeWidth={2}
              />
            )}

            {/* Show markers for the points being drawn */}
            {isDrawing && points.map((point, index) => (
              <Marker
                key={index}
                coordinate={point}
                pinColor="red"
              />
            ))}
          </MapView>

          {showInstructions && !isDrawing && (
            <View style={styles.instructionsOverlay}>
              <Text style={styles.instructionsTitle}>Create Danger Zone Alerts</Text>
              <Text style={styles.instructionsText}>
                Tap "Draw" to start creating a new danger zone. Tap on the map to add points. 
                You need at least 4 points to define a danger zone.
              </Text>
              <TouchableOpacity
                style={styles.instructionsButton}
                activeOpacity={0.8}
                onPress={() => setShowInstructions(false)}
              >
                <Text style={styles.instructionsButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          )}

          {isDrawing ? (
            <View style={styles.drawingControls}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                activeOpacity={0.8}
                onPress={cancelDrawing}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.pointsCounter}>
                <Text style={styles.pointsText}>Points: {points.length}</Text>
                <Text style={styles.minPointsText}>(Min 4 required)</Text>
              </View>
              <TouchableOpacity 
                style={[
                  styles.finishButton, 
                  points.length < 4 && styles.disabledButton
                ]} 
                activeOpacity={0.8}
                onPress={finishDrawing}
                disabled={points.length < 4}
              >
                <Text style={styles.buttonText}>Finish</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mapButtons}>
              <TouchableOpacity 
                style={styles.drawButton} 
                activeOpacity={0.8}
                onPress={startDrawing}
              >
                <MaterialIcons name="edit" size={20} color="white" />
                <Text style={styles.buttonText}>Draw Danger Zone</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Your Danger Zones</Text>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : dangerZones.length === 0 ? (
            <View style={styles.emptyListContainer}>
              <Text style={styles.emptyListText}>No danger zones defined yet.</Text>
              <Text style={styles.emptyListSubText}>Use the 'Draw Danger Zone' button to create one.</Text>
            </View>
          ) : (
            <FlatList
              data={dangerZones}
              keyExtractor={(item) => item._id}
              renderItem={renderDangerZoneItem}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBackground}>
            <View style={styles.modalContent}>
              <ScrollView contentContainerStyle={styles.modalScrollContent}>
                <Text style={styles.modalTitle}>Danger Zone Details</Text>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter danger zone name"
                    value={name}
                    onChangeText={setName}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Description (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter description"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Danger Type</Text>
                  <View style={styles.pickerContainer}>
                    <SimplePicker
                      selectedValue={dangerType}
                      onValueChange={(itemValue) => setDangerType(itemValue)}
                      items={[
                        { label: 'Highway', value: 'highway' },
                        { label: 'River', value: 'river' },
                        { label: 'Wildlife', value: 'wildlife' },
                        { label: 'Cliff', value: 'cliff' },
                        { label: 'Road', value: 'road' },
                        { label: 'Other', value: 'other' },
                      ]}
                    />
                  </View>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Select Animal</Text>
                  <View style={styles.pickerContainer}>
                    <SimplePicker
                      selectedValue={selectedAnimal}
                      onValueChange={(itemValue) => setSelectedAnimal(itemValue)}
                      items={animals.map(animal => ({
                        label: animal.name,
                        value: animal._id
                      }))}
                    />
                  </View>
                </View>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelModalButton}
                    activeOpacity={0.8}
                    onPress={() => setModalVisible(false)}
                    disabled={isSaving}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveModalButton}
                    activeOpacity={0.8}
                    onPress={saveDangerZone}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.buttonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  mapContainer: {
    height: 350,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapButtons: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  drawButton: {
    flexDirection: 'row',
    backgroundColor: colors.yellow,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: colors.black,
  },
  drawingControls: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.yellow,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: colors.black,
  },
  finishButton: {
    backgroundColor: colors.yellow,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: colors.black,
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.5)', // Lighter yellow when disabled
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  pointsCounter: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  pointsText: {
    color: 'white',
    fontWeight: 'bold',
  },
  minPointsText: {
    color: 'white',
    fontSize: 12,
  },
  buttonText: {
    color: colors.black,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  emptyListText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gray,
  },
  emptyListSubText: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    marginTop: 8,
  },
  territoryItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  territoryItemContent: {
    flexDirection: 'row',
    padding: 12,
  },
  territoryDetails: {
    flex: 1,
  },
  territoryName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  territoryInfo: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 4,
  },
  dangerTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  dangerTypeText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: 'bold',
    fontSize: 12,
  },
  territoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 16,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    padding: 12,
  },
  selectedValueText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.primary,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pickerOption: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: colors.yellow,
    borderRadius: 8,
    margin: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: colors.black,
  },
  pickerOptionSelected: {
    backgroundColor: colors.danger,
  },
  pickerOptionText: {
    color: colors.black,
    fontWeight: 'bold',
    fontSize: 14,
  },
  pickerOptionTextSelected: {
    color: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelModalButton: {
    backgroundColor: colors.yellow,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: colors.black,
  },
  saveModalButton: {
    backgroundColor: colors.yellow,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: colors.black,
  },
  instructionsOverlay: {
    position: 'absolute',
    top: '20%',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  instructionsTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 10,
  },
  instructionsText: {
    color: 'white',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  instructionsButton: {
    backgroundColor: colors.yellow,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: colors.black,
  },
  instructionsButtonText: {
    color: colors.black,
    fontWeight: 'bold',
  },
});

export default DangerZone; 