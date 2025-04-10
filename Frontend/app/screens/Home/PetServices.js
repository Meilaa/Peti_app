import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  Modal,
  ScrollView,
  Linking,
  Platform,
  Image,
  Dimensions,
  Alert
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons, FontAwesome5, Ionicons, Entypo } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import Vet from '../../../assets/images/vet.jpg';
import Store from '../../../assets/images/petStore.jpg';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Responsive font size function
const normalize = (size) => {
  const scale = width / 375; // 375 is standard iPhone width
  const newSize = size * scale;
  return Math.round(newSize);
};

// Nominatim API (OpenStreetMap's free geocoding service)
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Default image if no photo available
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1606425270259-ad2604428e34?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';

// Categories of pet services with OSM tags
const categories = [
  { 
    id: 'vet', 
    name: 'Veterinary Clinics', 
    icon: 'briefcase-medical', 
    color: colors.yellow, 
    osmTag: 'amenity=veterinary',
    image: Vet, // Direct reference to the imported image
  },
  { 
    id: 'store', 
    name: 'Pet Stores', 
    icon: 'store', 
    color: colors.yellow, 
    osmTag: 'shop=pet',
    image: Store, // Direct reference to the imported image
  }
];

export default function PetServices() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('vet');
  const [selectedService, setSelectedService] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [serviceDetails, setServiceDetails] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        // Request location permissions
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setLoading(false);
          return;
        }

        // Get current location
        let location = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.Balanced 
        });
        setLocation(location);
        fetchNearbyServices(location.coords.latitude, location.coords.longitude, selectedCategory);
      } catch (error) {
        console.error('Location error:', error);
        setErrorMsg('Could not get your location. Using default location.');
        // Use default location if getting current location fails
        const defaultLocation = {
          coords: {
            latitude: 37.7749, // San Francisco as default
            longitude: -122.4194
          }
        };
        setLocation(defaultLocation);
        fetchNearbyServices(defaultLocation.coords.latitude, defaultLocation.coords.longitude, selectedCategory);
      }
    })();
  }, []);

  useEffect(() => {
    if (location) {
      fetchNearbyServices(location.coords.latitude, location.coords.longitude, selectedCategory);
    }
  }, [selectedCategory]);

  const fetchNearbyServices = async (latitude, longitude, categoryId) => {
    setLoading(true);
    
    try {
      const selectedCategoryObj = categories.find(cat => cat.id === categoryId);
      if (!selectedCategoryObj) {
        throw new Error('Invalid category selected');
      }
      
      const osmTag = selectedCategoryObj.osmTag;
      const radius = 5000; // 5km radius
      
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["${osmTag.split('=')[0]}"="${osmTag.split('=')[1]}"](around:${radius},${latitude},${longitude});
          way["${osmTag.split('=')[0]}"="${osmTag.split('=')[1]}"](around:${radius},${latitude},${longitude});
          relation["${osmTag.split('=')[0]}"="${osmTag.split('=')[1]}"](around:${radius},${latitude},${longitude});
        );
        out body;
        >;
        out skel qt;
      `;
      
      console.log('Fetching from Overpass API');
      
      try {
        const response = await fetch(OVERPASS_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `data=${encodeURIComponent(overpassQuery)}`,
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.elements && data.elements.length > 0) {
          const osmPlaces = processOsmData(data.elements, selectedCategoryObj);
          setServices(osmPlaces);
          console.log(`Found ${osmPlaces.length} ${selectedCategoryObj.name}`);
        } else {
          console.log('No results from Overpass API, using fallback data');
          fallbackToMockData(latitude, longitude, categoryId);
        }
      } catch (apiError) {
        console.error('Error with Overpass API:', apiError);
        fallbackToMockData(latitude, longitude, categoryId);
      }
    } catch (error) {
      console.error('General error in fetchNearbyServices:', error);
      fallbackToMockData(latitude, longitude, categoryId);
    } finally {
      setLoading(false);
    }
  };
  
  const processOsmData = (elements, category) => {
    const places = elements.filter(element => 
      element.type === 'node' && element.tags
    ).map(element => {
      const { id, lat, lon, tags } = element;
      
      return {
        id: `osm-${id}`,
        name: tags.name || tags.brand || `${category.name} (Unnamed)`,
        geometry: {
          location: {
            lat: lat,
            lng: lon
          }
        },
        vicinity: tags['addr:street'] 
          ? `${tags['addr:housenumber'] || ''} ${tags['addr:street']}, ${tags['addr:city'] || ''}`
          : 'Address unavailable',
        rating: (Math.random() * 2 + 3).toFixed(1),
        user_ratings_total: Math.floor(Math.random() * 50) + 5,
        photos: [{ photo_reference: category.placeholderImage }],
        opening_hours: { 
          open_now: tags.opening_hours ? isOpenNow(tags.opening_hours) : Math.random() > 0.3 
        },
        phone: tags.phone || tags['contact:phone'],
        website: tags.website || tags['contact:website'],
        osmTags: tags
      };
    });
    
    return places;
  };
  
  const isOpenNow = (openingHoursString) => {
    try {
      const now = new Date();
      const day = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][now.getDay()];
      const hour = now.getHours();
      
      if (openingHoursString.includes(day)) {
        if (openingHoursString.includes('24/7')) {
          return true;
        }
        
        if (hour >= 9 && hour < 18) {
          return true;
        }
      }
      
      return false;
    } catch (e) {
      return Math.random() > 0.3;
    }
  };
  
  const fallbackToMockData = (latitude, longitude, category) => {
    console.log('Falling back to local mock data');
    const mockData = generateMockData(latitude, longitude, category);
    setServices(mockData);
    
    Alert.alert(
      'Using Demo Data',
      'Could not retrieve data from OpenStreetMap. Using locally generated demo data instead.',
      [{ text: 'OK' }]
    );
  };
  
  const generateMockData = (lat, lng, categoryId) => {
    const count = 8;
    const radius = 0.01;
    
    const selectedCategoryObj = categories.find(cat => cat.id === categoryId);
    let mockServiceNames = [];
    
    if (categoryId === 'vet') {
      mockServiceNames = [
        "Paws & Claws Veterinary Clinic", 
        "Happy Pets Animal Hospital", 
        "Furry Friends Vet Care", 
        "Healthy Paws Veterinary",
        "City Animal Hospital",
        "PetMed Emergency Care",
        "Main Street Animal Clinic",
        "All Creatures Veterinary"
      ];
    } else if (categoryId === 'store') {
      mockServiceNames = [
        "Pet Supplies Plus", 
        "Pawsome Pet Store", 
        "The Pet Pantry", 
        "Bark Avenue Pet Boutique",
        "Fur & Feathers Pet Shop",
        "The Pampered Pet",
        "Pet Paradise Supplies",
        "Wags to Whiskers Shop"
      ];
    }
    
    return Array(count).fill().map((_, i) => {
      const latOffset = (Math.random() - 0.5) * radius;
      const lngOffset = (Math.random() - 0.5) * radius;
      
      return {
        id: `mock-${categoryId}-${i}`,
        name: mockServiceNames[i % mockServiceNames.length],
        geometry: {
          location: {
            lat: parseFloat(lat) + latOffset,
            lng: parseFloat(lng) + lngOffset
          }
        },
        vicinity: `${Math.floor(Math.random() * 1000) + 100} Main Street`,
        rating: (Math.random() * 2 + 3).toFixed(1),
        user_ratings_total: Math.floor(Math.random() * 100) + 10,
        photos: [{ photo_reference: selectedCategoryObj.placeholderImage }],
        opening_hours: { open_now: Math.random() > 0.3 },
        phone: `(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        website: "https://www.example.com",
        services: ['Pet Examination', 'Vaccinations', 'Grooming', 'Surgery'],
        osmTags: {
          name: mockServiceNames[i % mockServiceNames.length],
          'addr:street': 'Main Street',
          'addr:housenumber': `${Math.floor(Math.random() * 1000) + 100}`
        }
      };
    });
  };

  const fetchServiceDetails = async (service) => {
    if (service.osmTags) {
      const details = {
        ...service,
        formatted_address: buildAddress(service.osmTags),
        formatted_phone_number: service.phone || service.osmTags.phone || service.osmTags['contact:phone'],
        website: service.website || service.osmTags.website || service.osmTags['contact:website'],
        services: generateServicesFromTags(service.osmTags, service.id.split('-')[1])
      };
      
      setServiceDetails(details);
      return;
    }
    
    setServiceDetails(service);
  };
  
  const buildAddress = (tags) => {
    const parts = [];
    
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:city']) parts.push(tags['addr:city']);
    if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
    if (tags['addr:state']) parts.push(tags['addr:state']);
    
    return parts.join(', ') || 'Address unavailable';
  };
  
  const generateServicesFromTags = (tags, categoryId) => {
    if (categoryId === 'vet' || categoryId.includes('vet')) {
      return [
        'Pet Examination',
        'Vaccinations',
        tags.surgery === 'yes' ? 'Surgery' : 'Basic Treatment',
        tags.grooming === 'yes' ? 'Grooming' : 'Health Consultation'
      ];
    } else {
      return [
        'Pet Food',
        'Pet Supplies',
        'Pet Toys',
        tags.grooming === 'yes' ? 'Grooming Services' : 'Pet Accessories'
      ];
    }
  };

  // When opening the modal, set the selected service with the category
  const handleMarkerPress = (service) => {
    // Add the category to the service object to ensure it's available
    const serviceWithCategory = {
      ...service,
      categoryId: selectedCategory
    };
    
    setSelectedService(serviceWithCategory);
    setServiceDetails(null);
    fetchServiceDetails(serviceWithCategory);
    setModalVisible(true);
  };

  const getDirections = (lat, lng) => {
    if (!selectedService) return;
    
    try {
      const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
      const latLng = `${lat},${lng}`;
      const label = selectedService.name;
      const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`
      });

      Linking.openURL(url);
    } catch (error) {
      console.error('Error opening maps:', error);
      Alert.alert('Error', 'Could not open maps application.');
    }
  };

  const openPhone = (phone) => {
    if (!phone) {
      Alert.alert('Error', 'No phone number available.');
      return;
    }
    
    try {
      Linking.openURL(`tel:${phone}`);
    } catch (error) {
      console.error('Error making phone call:', error);
      Alert.alert('Error', 'Could not open phone application.');
    }
  };

  const openWebsite = (website) => {
    if (!website) {
      Alert.alert('Error', 'No website available.');
      return;
    }
    
    try {
      Linking.openURL(website);
    } catch (error) {
      console.error('Error opening website:', error);
      Alert.alert('Error', 'Could not open website.');
    }
  };

  const getServiceImage = (service) => {
    console.log("Getting image for service:", service?.id);
    
    // Extract the category ID directly from the selected service category
    // This ensures we're using the actual selected category
    if (service && service.id) {
      // Check if it's a mock service or OSM service
      if (service.id.startsWith('mock')) {
        const categoryId = service.id.split('-')[1];
        console.log("Mock service with category:", categoryId);
        
        // Find the category and return its image
        const category = categories.find(cat => cat.id === categoryId);
        if (category) {
          console.log("Found category with image:", category.id);
          return category.image;
        }
      } else if (service.id.startsWith('osm')) {
        // For OSM services, determine category based on the currently selected category
        console.log("OSM service with selected category:", selectedCategory);
        const category = categories.find(cat => cat.id === selectedCategory);
        if (category) {
          return category.image;
        }
      }
    }
    
    // Default fallback - should not reach here if categories are properly defined
    console.log("Using default category (first in list)");
    return categories[0].image;
  };

  let text = 'Waiting for location...';
  if (errorMsg) {
    text = errorMsg;
  } else if (location) {
    text = 'Location found!';
  }

  if (loading && !services.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.yellow} />
        <Text style={styles.loadingText}>Finding nearby pet services...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nearby Pet Services</Text>
        
        <TouchableOpacity 
          style={styles.attribution}
          onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
        >
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && { backgroundColor: category.color }
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <FontAwesome5 
              name={category.icon} 
              size={18} 
              color={selectedCategory === category.id ? 'white' : category.color} 
            />
            <Text 
              style={[
                styles.categoryText,
                selectedCategory === category.id && { color: 'white' }
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {location ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          attributionEnabled={true}
        >
          {services.map((service) => (
            <Marker
              key={service.id}
              coordinate={{
                latitude: service.geometry.location.lat,
                longitude: service.geometry.location.lng
              }}
              title={service.name}
              description={service.vicinity}
              pinColor={categories.find(cat => cat.id === selectedCategory).color}
              onPress={() => handleMarkerPress(service)}
            />
          ))}
        </MapView>
      ) : (
        <View style={styles.center}>
          <Text>{text}</Text>
        </View>
      )}

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Nearby {categories.find(cat => cat.id === selectedCategory).name}</Text>
        {services.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>No services found in this area.</Text>
            <Text style={styles.noResultsSubtext}>Try a different category or increase the search radius.</Text>
          </View>
        ) : (
          <ScrollView style={styles.list}>
            {services.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.listItem}
                onPress={() => handleMarkerPress(service)}
              >
                <View style={styles.serviceIconContainer}>
                  <FontAwesome5 
                    name={categories.find(cat => cat.id === selectedCategory).icon} 
                    size={24} 
                    color={categories.find(cat => cat.id === selectedCategory).color} 
                  />
                </View>
                <View style={styles.serviceDetails}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceAddress}>{service.vicinity}</Text>
                  <View style={styles.serviceRating}>
                    <Ionicons name="star" size={14} color={colors.yellow} />
                    <Text style={styles.ratingText}>
                      {service.rating} ({service.user_ratings_total} reviews)
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.grey} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={colors.black} />
            </TouchableOpacity>

            {selectedService && (
              <ScrollView>
               <View style={styles.serviceImageContainer}>
                <Image
                  source={getServiceImage(selectedService)}
                  style={styles.serviceImage}
                  resizeMode="cover"
                  onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
                />
              </View>

                <Text style={styles.modalTitle}>{selectedService.name}</Text>
                <Text style={styles.modalAddress}>
                  {selectedService.vicinity || serviceDetails?.formatted_address || 'Address not available'}
                </Text>
                
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color={colors.yellow} />
                  <Text style={styles.modalRating}>
                    {selectedService.rating} ({selectedService.user_ratings_total || 0} reviews)
                  </Text>
                </View>

                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => getDirections(
                      selectedService.geometry.location.lat, 
                      selectedService.geometry.location.lng
                    )}
                  >
                    <Ionicons name="navigate" size={20} color={colors.white} />
                    <Text style={styles.actionButtonText}>Directions</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, {backgroundColor: colors.success}]}
                    onPress={() => openPhone(
                      serviceDetails?.formatted_phone_number || 
                      selectedService.phone ||
                      (selectedService.osmTags && selectedService.osmTags.phone)
                    )}
                  >
                    <Ionicons name="call" size={20} color={colors.white} />
                    <Text style={styles.actionButtonText}>Call</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, {backgroundColor: colors.primary}]}
                    onPress={() => openWebsite(
                      selectedService.website || 
                      (selectedService.osmTags && selectedService.osmTags.website)
                    )}
                  >
                    <Ionicons name="globe-outline" size={20} color={colors.white} />
                    <Text style={styles.actionButtonText}>Website</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: height * 0.018,
    fontSize: normalize(16),
    color: colors.black,
  },
  header: {
    backgroundColor: colors.white,
    justifyContent: 'center',
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.05,
    paddingTop: Platform.OS === 'ios' ? height * 0.08 : height * 0.06,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: normalize(24),
    fontWeight: '600',
    color: colors.black,
  },
  attribution: {
    position: 'absolute',
    right: width * 0.025,
    bottom: height * 0.006,
  },
  attributionText: {
    fontSize: normalize(10),
    color: colors.grey,
  },
  categoryContainer: {
    maxHeight: height * 0.07,
    backgroundColor: colors.white,
    paddingVertical: height * 0.012,
  },
  categoryContent: {
    paddingHorizontal: width * 0.038,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: width * 0.038,
    paddingVertical: height * 0.01,
    borderRadius: width * 0.05,
    marginRight: width * 0.025,
  },
  categoryText: {
    marginLeft: width * 0.012,
    fontSize: normalize(14),
    fontWeight: '500',
  },
  map: {
    height: height * 0.4,
    width: width,
  },
  listContainer: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: width * 0.038,
    paddingTop: height * 0.018,
  },
  listTitle: {
    fontSize: normalize(18),
    fontWeight: '600',
    marginBottom: height * 0.012,
    color: colors.black,
  },
  list: {
    flex: 1,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: height * 0.06,
  },
  noResultsText: {
    fontSize: normalize(16),
    fontWeight: 'bold',
    color: colors.black,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: normalize(14),
    color: colors.grey,
    textAlign: 'center',
    marginTop: height * 0.006,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: height * 0.015,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  serviceIconContainer: {
    width: width * 0.12,
    height: width * 0.12,
    borderRadius: width * 0.06,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: width * 0.038,
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontSize: normalize(16),
    fontWeight: '600',
    color: colors.black,
  },
  serviceAddress: {
    fontSize: normalize(14),
    color: colors.grey,
    marginTop: height * 0.004,
  },
  serviceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: height * 0.006,
  },
  ratingText: {
    fontSize: normalize(12),
    color: colors.black,
    marginLeft: width * 0.01,
  },
  openStatus: {
    fontSize: normalize(12),
    fontWeight: '500',
    marginLeft: width * 0.025,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: width * 0.05,
    borderTopRightRadius: width * 0.05,
    padding: width * 0.05,
    maxHeight: height * 0.8,
  },
  closeButton: {
    position: 'absolute',
    right: width * 0.038,
    top: height * 0.018,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: width * 0.05,
    width: width * 0.1,
    height: width * 0.1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceImageContainer: {
    width: '100%',
    height: height * 0.25,
    borderRadius: width * 0.025,
    overflow: 'hidden',
    marginBottom: height * 0.018,
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  modalTitle: {
    fontSize: normalize(22),
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: height * 0.006,
  },
  modalAddress: {
    fontSize: normalize(16),
    color: colors.grey,
    marginBottom: height * 0.012,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.025,
  },
  modalRating: {
    fontSize: normalize(14),
    color: colors.black,
    marginLeft: width * 0.012,
  },
  modalOpenStatus: {
    fontSize: normalize(14),
    fontWeight: '500',
    marginLeft: width * 0.025,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: height * 0.012,
    gap: width * 0.012
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.yellow,
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.03,
    borderRadius: width * 0.025,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  actionButtonText: {
    color: colors.white,
    marginLeft: width * 0.012,
    fontSize: normalize(12),
  },
  servicesContainer: {
    marginTop: height * 0.012,
    marginBottom: height * 0.025,
  },
  servicesTitle: {
    fontSize: normalize(18),
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: height * 0.012,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.006,
  },
  serviceText: {
    fontSize: normalize(15),
    color: colors.black,
  },
  attributionContainer: {
    marginTop: height * 0.025,
    padding: width * 0.025,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    alignItems: 'center',
  },
  attributionTitle: {
    fontSize: normalize(12),
    color: colors.grey,
  },
  attributionLink: {
    fontSize: normalize(12),
    color: colors.primary,
    textDecorationLine: 'underline',
    marginTop: height * 0.004,
  },
});