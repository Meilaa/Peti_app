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
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polygon } from 'react-native-maps';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import environments from '../../constants/enviroments';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const normalize = (size) => {
  const scale = width / 375; // 375 is the standard iPhone width
  return size * scale;
};

const SafeZone = () => {
  const router = useRouter();
  // State for territories
  const [territories, setTerritories] = useState([]);
  const [currentTerritory, setCurrentTerritory] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [animals, setAnimals] = useState([]);
  const [apiStatus, setApiStatus] = useState('checking'); // 'checking', 'online', 'offline'
  
  // State for territory drawing
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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
    loadTerritories();
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
        const response = await fetch(`${apiUrl}/api/territories/test`, {
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
      const apiUrl = environments.API_BASE_URL;
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

  const loadTerritories = async () => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No token found');
      }
  
      console.log('📡 Fetching territories...');
      const response = await fetchWithMultipleEndpoints('/api/territories', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      console.log('🗺️ Loaded territories:', response.length);
      setTerritories(response);
      await AsyncStorage.setItem('territories', JSON.stringify(response));
      return response; // Return the territories for potential use
    } catch (error) {
      console.error('Error fetching territories:', error);
      
      // Try to load from AsyncStorage if API fails
      try {
        console.log('⚠️ API failed, loading territories from local storage');
        const savedTerritories = await AsyncStorage.getItem('territories');
        if (savedTerritories) {
          const parsedTerritories = JSON.parse(savedTerritories);
          console.log('📱 Loaded territories from AsyncStorage:', parsedTerritories.length);
          setTerritories(parsedTerritories);
          return parsedTerritories;
        }
        return [];
      } catch (e) {
        console.error('Error loading from AsyncStorage:', e);
        return [];
      }
    }
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setPoints([]);
    setCurrentTerritory(null);
  };

  const handleMapPress = (event) => {
    if (!isDrawing) return;
    
    const { coordinate } = event.nativeEvent;
    setPoints([...points, coordinate]);
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setPoints([]);
  };

  const finishDrawing = () => {
    if (points.length < 4) {
      Alert.alert('Not enough points', 'A safe zone requires at least 4 points');
      return;
    }
    
    setIsDrawing(false);
    setModalVisible(true);
  };

  const saveTerritory = async () => {
    console.log("💾 Saving safe zone");
    
    // Basic validation
    if (!name) {
      Alert.alert("Missing Name", "Please enter a name for this safe zone");
      return;
    }
    
    if (!selectedAnimal) {
      Alert.alert("No Animal Selected", "Please select an animal for this safe zone");
      return;
    }
    
    if (points.length < 3) {
      Alert.alert("Not Enough Points", "Please add at least 3 points to create a safe zone");
      return;
    }
    
    // Show saving indicator
    setIsSaving(true);
    
    try {
      const tempId = Date.now().toString();
      const newTerritory = {
        _id: tempId,
        name: name,
        description: description || "",
        coordinates: points,
        animal: selectedAnimal,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isLocal: true
      };
      
      // Add to local state immediately for better UX
      const updatedTerritories = [...territories, newTerritory];
      setTerritories(updatedTerritories);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('territories', JSON.stringify(updatedTerritories));
      console.log("✅ Territory saved to local storage");
      
      // Reset the form
      setName('');
      setDescription('');
      setPoints([]);
      setModalVisible(false);
      
      // Focus the map on the new territory
      if (points.length > 0) {
        const region = getRegionForCoordinates(points);
        setMapRegion(region);
      }
      
      // Now try to save to MongoDB through API
      try {
        const token = await getToken();
        if (!token) throw new Error("No authentication token found");
        
        const apiData = {
          name: name,
          description: description || "",
          coordinates: points,
          animalId: selectedAnimal
        };
        
        const response = await fetch(`${environments.API_BASE_URL}/api/territories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(apiData)
        });
        
        if (response.ok) {
          const serverResponse = await response.json();
          console.log("✅ Territory saved to MongoDB:", serverResponse);
          
          // Update the local record with the server ID and reload all territories
          await loadTerritories(); // This will refresh the list
          
          Alert.alert("Success", "Safe zone saved successfully");
        } else {
          throw new Error("Server returned an error");
        }
      } catch (apiError) {
        console.error("API sync error:", apiError);
        // Even if API fails, we've saved locally - just refresh the local list
        await loadTerritories();
        Alert.alert(
          "Saved Locally", 
          "Safe zone was saved to your device but couldn't be synced with the server."
        );
      }
    } catch (error) {
      console.error("Error saving territory:", error);
      Alert.alert("Error", "Failed to save safe zone. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTerritory = async (territory) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this safe zone?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // For local-only territories, just remove from state and AsyncStorage
              if (territory.isLocal) {
                const updatedTerritories = territories.filter(t => t._id !== territory._id);
                setTerritories(updatedTerritories);
                await AsyncStorage.setItem('territories', JSON.stringify(updatedTerritories));
                
                // Reset current territory if it was the deleted one
                if (currentTerritory && currentTerritory._id === territory._id) {
                  setCurrentTerritory(null);
                }
                
                Alert.alert('Success', 'Safe zone deleted successfully');
                return;
              }
              
              const token = await getToken();
              if (!token) {
                throw new Error('No token found');
              }

              console.log('🗑️ Deleting territory:', territory._id);
              const response = await fetchWithMultipleEndpoints(`/api/territories/${territory._id}`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              // Update local state
              const updatedTerritories = territories.filter(t => t._id !== territory._id);
              setTerritories(updatedTerritories);
              
              // Update AsyncStorage
              await AsyncStorage.setItem('territories', JSON.stringify(updatedTerritories));
              
              // Reset current territory if it was the deleted one
              if (currentTerritory && currentTerritory._id === territory._id) {
                setCurrentTerritory(null);
              }
              
              Alert.alert('Success', 'Safe zone deleted successfully');
            } catch (error) {
              console.error('Error deleting territory:', error);
              Alert.alert('Error', 'Failed to delete safe zone from server. Removed locally.');
              
              // Still remove from local state if it failed on the server but exists locally
              const updatedTerritories = territories.filter(t => t._id !== territory._id);
              setTerritories(updatedTerritories);
              await AsyncStorage.setItem('territories', JSON.stringify(updatedTerritories));
              
              // Reset current territory if it was the deleted one
              if (currentTerritory && currentTerritory._id === territory._id) {
                setCurrentTerritory(null);
              }
            }
          },
        },
      ]
    );
  };

  const viewTerritory = (territory) => {
    if (territory && territory.coordinates && territory.coordinates.length > 0) {
      const region = getRegionForCoordinates(territory.coordinates);
      setMapRegion(region);
    }
  };

  const renderTerritoryItem = ({ item }) => {
    // Find animal name - handle both string IDs and populated animal objects
    let animalName = 'Unknown';
    
    if (typeof item.animal === 'object' && item.animal !== null) {
      // If animal is populated (from API)
      animalName = item.animal.name;
    } else if (typeof item.animal === 'string') {
      // If animal is just an ID (from local storage)
      const animalObj = animals.find(a => a._id === item.animal);
      animalName = animalObj ? animalObj.name : 'Unknown';
    }
    
    return (
      <TouchableOpacity
        style={[
          styles.territoryItem,
          currentTerritory && currentTerritory._id === item._id && styles.selectedTerritoryItem,
          item.isLocal && styles.localTerritoryItem
        ]}
        onPress={() => viewTerritory(item)}
      >
        <View style={styles.territoryInfo}>
          <Text style={styles.territoryName}>
            {item.name} {item.isLocal && <Text style={styles.localBadge}>(Local)</Text>}
          </Text>
          <Text style={styles.territoryMeta}>
            Animal: {animalName} • Points: {item.coordinates.length}
          </Text>
          {item.description ? (
            <Text style={styles.territoryDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteTerritory(item)}
        >
          <MaterialIcons name="delete" size={24} color={environments.colors.error || '#FF5252'} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Add helper function to calculate the region for a set of coordinates
  const getRegionForCoordinates = (coordinates) => {
    if (!coordinates || coordinates.length === 0) return null;
    
    let minLat = Number.MAX_VALUE;
    let maxLat = Number.MIN_VALUE;
    let minLng = Number.MAX_VALUE;
    let maxLng = Number.MIN_VALUE;

    coordinates.forEach(coord => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLng = Math.min(minLng, coord.longitude);
      maxLng = Math.max(maxLng, coord.longitude);
    });

    const latDelta = (maxLat - minLat) * 1.5; // Add some padding
    const lngDelta = (maxLng - minLng) * 1.5;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.005, latDelta),
      longitudeDelta: Math.max(0.005, lngDelta)
    };
  };

  // Add a debug function
  const debugInfo = async () => {
    try {
      // Get territories from AsyncStorage
      const territoriesStr = await AsyncStorage.getItem('territories');
      const territoriesData = territoriesStr ? JSON.parse(territoriesStr) : [];
      
      // Create debug message
      const debugMessage = 
        `Debug Info:\n\n` +
        `Territories in AsyncStorage: ${territoriesData.length}\n` +
        `Territories in state: ${territories.length}\n` +
        `Points in current drawing: ${points.length}\n` +
        `Selected animal: ${selectedAnimal || 'None'}\n` +
        `Is drawing active: ${isDrawing}\n` +
        `Is saving: ${isSaving}\n` +
        `API URL: ${environments.API_BASE_URL}`;
      
      // Show debug info
      Alert.alert('Debug Info', debugMessage);
    } catch (error) {
      Alert.alert('Error', `Debug error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={environments.colors.primary || colors.yellow} />
        <Text style={{ marginTop: 16, fontSize: 16 }}>Loading Safe Zones...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.backButtonContainer}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Safe Zones</Text>
        </View>
    
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={mapRegion}
            onPress={handleMapPress}
            onLongPress={isDrawing ? undefined : startDrawing}
            scrollEnabled={true}
            zoomEnabled={true}
          >
            {/* Display current territory */}
            {currentTerritory && (
              <Polygon
                coordinates={currentTerritory.coordinates}
                fillColor="rgba(255, 200, 0, 0.3)"
                strokeColor={colors.yellow}
                strokeWidth={2}
              />
            )}
    
            {/* Display other territories */}
            {territories
              .filter(t => !currentTerritory || t._id !== currentTerritory._id)
              .map(territory => (
                <Polygon
                  key={territory._id}
                  coordinates={territory.coordinates}
                  fillColor="rgba(200, 200, 200, 0.2)"
                  strokeColor="#BDBDBD"
                  strokeWidth={1}
                />
              ))}
    
            {/* Display points being drawn */}
            {isDrawing && points.map((point, index) => (
              <Marker
                key={index}
                coordinate={point}
                pinColor={colors.yellow}
              />
            ))}
    
            {/* Display line for current drawing */}
            {isDrawing && points.length > 1 && (
              <Polygon
                coordinates={points}
                fillColor="rgba(255, 200, 0, 0.3)"
                strokeColor={colors.yellow}
                strokeWidth={2}
              />
            )}
          </MapView>
    
          {/* Help button */}
          <TouchableOpacity
            style={[styles.helpButton, { backgroundColor: 'white', borderRadius: 50, padding: 8 }]}
            onPress={() => setShowInstructions(!showInstructions)}
          >
            <MaterialIcons name="help-outline" size={24} color={colors.yellow} />
          </TouchableOpacity>
    
          {/* Instructions overlay */}
          {showInstructions && (
            <View style={styles.instructionsOverlay}>
              <Text style={styles.instructionsTitle}>How to Create a Safe Zone:</Text>
              <View style={styles.instructionStep}>
                <MaterialIcons name="touch-app" size={22} color="#333" />
                <Text style={styles.instructionText}>Long press anywhere on the map to start</Text>
              </View>
              <View style={styles.instructionStep}>
                <MaterialIcons name="add-location" size={22} color="#333" />
                <Text style={styles.instructionText}>Tap to add points (minimum 4)</Text>
              </View>
              <View style={styles.instructionStep}>
                <MaterialIcons name="check-circle" size={22} color="#333" />
                <Text style={styles.instructionText}>Tap Finish when done</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeInstructionsButton}
                onPress={() => setShowInstructions(false)}
              >
                <Text style={styles.closeButtonText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          )}
    
          {/* Drawing Controls */}
          {isDrawing ? (
            <View style={styles.drawingControls}>
              <Text style={styles.drawingText}>
                {points.length === 0 ? 
                  "Tap on map to add points" : 
                  `Points: ${points.length}/4 (minimum)`}
              </Text>
              <View style={styles.drawingButtons}>
                <TouchableOpacity
                  style={[styles.drawingButton, styles.cancelButton]}
                  onPress={cancelDrawing}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.drawingButton,
                    styles.finishButton,
                    points.length < 4 && styles.disabledButton
                  ]}
                  onPress={finishDrawing}
                  disabled={points.length < 4}
                >
                  <Text style={styles.buttonText}>Finish</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={startDrawing}
            >
              <MaterialIcons name="add-location" size={24} color="#FFF" />
              <Text style={styles.addButtonText}>Draw Safe Zone</Text>
            </TouchableOpacity>
          )}
        </View>
    
        {/* Safe Zones List */}
        <View style={styles.territoriesList}>
          <Text style={styles.listTitle}>Pet Safe Zones</Text>
          {territories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="map-marker-radius" size={60} color="#BDBDBD" />
              <Text style={styles.emptyText}>
                No safe zones yet. Create one by tapping "Draw Safe Zone".
              </Text>
            </View>
          ) : (
            <View>
              {territories.map(item => (
                <View key={item._id}>
                  {renderTerritoryItem({ item })}
                </View>
              ))}
            </View>
          )}
        </View>
    
        {/* Modal for naming territory */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => !isSaving && setModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Save Safe Zone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Name (required)"
                  value={name}
                  onChangeText={setName}
                  editable={!isSaving}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description (optional)"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  editable={!isSaving}
                />
                {animals.length > 0 ? (
                  <View style={styles.selectContainer}>
                    <Text style={styles.selectLabel}>Select Animal:</Text>
                    <View style={styles.animalOptions}>
                      {animals.map(animal => (
                        <TouchableOpacity
                          key={animal._id}
                          style={[
                            styles.animalOption,
                            selectedAnimal === animal._id && styles.selectedAnimalOption
                          ]}
                          onPress={() => !isSaving && setSelectedAnimal(animal._id)}
                          disabled={isSaving}
                        >
                          <Text
                            style={[
                              styles.animalOptionText,
                              selectedAnimal === animal._id && styles.selectedAnimalOptionText
                            ]}
                          >
                            {animal.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ) : (
                  <Text style={styles.errorText}>No animals found</Text>
                )}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[
                      styles.modalButton, 
                      styles.cancelButton,
                      isSaving && styles.disabledButton
                    ]}
                    onPress={() => !isSaving && setModalVisible(false)}
                    disabled={isSaving}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton, 
                      styles.saveButton,
                      isSaving && styles.disabledButton
                    ]}
                    onPress={saveTerritory}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.buttonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </ScrollView>
  );
  
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.yellow,
    paddingTop: Platform.OS === 'ios' ? height * 0.06 : height * 0.05,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.015,
    backgroundColor: colors.yellow,
  },
  
  backButtonContainer: {
    position: 'absolute',
    left: 16,
  },
  
  placeholder: {
    width: 40,
  },
  title: {
    fontSize: normalize(24),
    fontWeight: '600',
    textAlign: 'center',
    marginTop: height * 0.03,
  },
  mapContainer: {
    height: height * 0.65,
    margin: width * 0.04,
    borderRadius: width * 0.04,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: height * 0.002 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  addButton: {
    position: 'absolute',
    bottom: 16,
    left: '45%', // Centers the button horizontally
    transform: [{ translateX: -65 }], // Adjust this value to half of the button's width (for a 130px width button)
    backgroundColor: colors.black,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
addButtonText: {
    color: colors.white,
    marginLeft: 10,
    fontWeight: '600',
    fontSize: 14,
  },
  drawingControls: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  drawingText: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
    fontSize: 16,
    color: colors.black,
  },
  drawingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  drawingButton: {
    paddingVertical: 8, // Reduced padding
    paddingHorizontal: 16, // Reduced padding
    borderRadius: 10, // Slightly smaller border radius
    minWidth: 105, // Reduced min width
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  cancelButton: {
    backgroundColor: colors.black,
  },
  finishButton: {
    backgroundColor: colors.yellow,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  territoriesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    color: '#757575',
    fontSize: 16,
    fontStyle: 'italic',
  },
  territoryItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: width * 0.04,
    padding: width * 0.04,
    marginBottom: height * 0.02,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: height * 0.001 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#E0E0E0',
  },
  selectedTerritoryItem: {
    backgroundColor: 'rgba(255, 200, 0, 0.08)',
    borderColor: colors.yellow,
    borderWidth: 2,
    borderLeftWidth: 4,
    borderLeftColor: colors.yellow,
  },
  localTerritoryItem: {
    borderLeftColor: '#42A5F5',
  },
  localBadge: {
    fontSize: 12,
    color: '#42A5F5',
    fontStyle: 'italic',
    marginLeft: 6,
  },
  territoryInfo: {
    flex: 1,
  },
  territoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  territoryMeta: {
    fontSize: 13,
    color: '#757575',
    marginTop: 6,
  },
  territoryDescription: {
    marginTop: 8,
    fontSize: 14,
    color: '#555',
  },
  deleteButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,0,0,0.08)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: width * 0.04,
    padding: width * 0.05,
    width: '90%',
    maxWidth: width * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: height * 0.002 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: normalize(20),
    fontWeight: '600',
    marginBottom: height * 0.02,
    textAlign: 'center',
    color: colors.black,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: width * 0.03,
    padding: width * 0.04,
    marginBottom: height * 0.02,
    fontSize: normalize(16),
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  selectContainer: {
    marginBottom: 24,
  },
  selectLabel: {
    fontSize: 17,
    marginBottom: 14,
    fontWeight: '500',
    color: '#333',
  },
  animalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  animalOption: {
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
    margin: 6,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  selectedAnimalOption: {
    backgroundColor: colors.yellow,
    borderColor: colors.yellow,
  },
  animalOptionText: {
    color: '#333',
    fontSize: 15,
  },
  selectedAnimalOptionText: {
    color: '#FFF',
    fontWeight: '600',
  },
  errorText: {
    color: '#FF5252',
    marginBottom: 16,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    paddingVertical: 10,  // Reduced padding for a smaller button
    paddingHorizontal: 20,  // Reduced padding for a smaller button
    borderRadius: 10,  // Slightly smaller border radius
    minWidth: 115,  // Reduced minWidth to make the button smaller
    alignItems: 'center',
  },
saveButton: {
    backgroundColor: colors.yellow,
  },

  helpButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  instructionsOverlay: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  instructionsTitle: {
    fontSize: 18,
    marginBottom: 12,
    fontWeight: '600',
    color: colors.black,
    textAlign: 'center',
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    marginRight: 10,
  },
  instructionText: {
    fontSize: 14,
    color: colors.black,
    marginLeft: 10,
  },
  closeInstructionsButton: {
    backgroundColor: colors.yellow,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  debugButton: {
    display: 'none', // Hide it instead of completely removing to avoid breaking references
  },
  debugButtonText: {
    display: 'none',
  },
});

export default SafeZone; 