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

// Nominatim API (OpenStreetMap's free geocoding service)
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Default image if no photo available
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1606425270259-ad2604428e34?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';

// Categories of pet services with OSM tags
const categories = [
  { 
    id: 'vet', 
    name: 'Veterinarians', 
    icon: 'medical-bag', 
    color: colors.danger, 
    osmTag: 'amenity=veterinary',
    placeholderImage: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
  },
  { 
    id: 'store', 
    name: 'Pet Stores', 
    icon: 'store', 
    color: colors.primary, 
    osmTag: 'shop=pet',
    placeholderImage: 'https://images.unsplash.com/photo-1583036623774-75a5b52345e9?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
  },
  { 
    id: 'hotel', 
    name: 'Pet Hotels', 
    icon: 'hotel', 
    color: colors.success, 
    osmTag: 'amenity=animal_boarding',
    placeholderImage: 'https://images.unsplash.com/photo-1546967900-1bea5f16b69d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
  },
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

  // Fetch nearby services using Overpass API (free OpenStreetMap data)
  const fetchNearbyServices = async (latitude, longitude, categoryId) => {
    setLoading(true);
    
    try {
      const selectedCategoryObj = categories.find(cat => cat.id === categoryId);
      if (!selectedCategoryObj) {
        throw new Error('Invalid category selected');
      }
      
      const osmTag = selectedCategoryObj.osmTag;
      const radius = 5000; // 5km radius
      
      // Build Overpass QL query - this query format finds amenities of the specified type in the radius
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
        
        // Process OSM data into a format our app can use
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
  
  // Process OpenStreetMap data into a format our app can use
  const processOsmData = (elements, category) => {
    // Filter for nodes (points) with tags
    const places = elements.filter(element => 
      element.type === 'node' && element.tags
    ).map(element => {
      // Extract relevant information
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
        rating: (Math.random() * 2 + 3).toFixed(1), // Random rating as OSM doesn't have ratings
        user_ratings_total: Math.floor(Math.random() * 50) + 5,
        photos: [{ photo_reference: category.placeholderImage }],
        opening_hours: { 
          open_now: tags.opening_hours ? isOpenNow(tags.opening_hours) : Math.random() > 0.3 
        },
        phone: tags.phone || tags['contact:phone'],
        website: tags.website || tags['contact:website'],
        // Store original OSM tags for later use
        osmTags: tags
      };
    });
    
    return places;
  };
  
  // Simple function to determine if a place is open based on OSM opening_hours tag
  const isOpenNow = (openingHoursString) => {
    // This is a very simplified check - in a real app, you'd need a proper parser
    // for the OSM opening_hours format which can be quite complex
    try {
      const now = new Date();
      const day = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][now.getDay()];
      const hour = now.getHours();
      
      // Check for day in opening hours
      if (openingHoursString.includes(day)) {
        // Simple check for 24/7
        if (openingHoursString.includes('24/7')) {
          return true;
        }
        
        // Very basic check for current hour in range
        // This is NOT a complete implementation
        if (hour >= 9 && hour < 18) { // Assume most places open 9am-6pm
          return true;
        }
      }
      
      return false;
    } catch (e) {
      return Math.random() > 0.3; // Fall back to random
    }
  };
  
  // Fallback to mock data when OSM data is unavailable
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
  
  // Generate mock data for demonstration purposes
  const generateMockData = (lat, lng, categoryId) => {
    const count = 8; // Number of mock locations
    const radius = 0.01; // Roughly 1km
    
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
    } else if (categoryId === 'hotel') {
      mockServiceNames = [
        "Luxury Paws Pet Resort", 
        "Happy Tails Pet Hotel", 
        "Pet Paradise Inn", 
        "The Barking Lot Suites",
        "Pets R&R Boarding",
        "Cozy Pets Hotel",
        "Furry Friends Retreat",
        "Pampered Paws Inn"
      ];
    }
    
    return Array(count).fill().map((_, i) => {
      // Generate random offset for coordinates
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
        rating: (Math.random() * 2 + 3).toFixed(1), // Random rating between 3.0 and 5.0
        user_ratings_total: Math.floor(Math.random() * 100) + 10,
        photos: [{ photo_reference: selectedCategoryObj.placeholderImage }],
        opening_hours: { open_now: Math.random() > 0.3 }, // 70% chance to be open
        phone: `(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        website: "https://www.example.com",
        services: ['Pet Examination', 'Vaccinations', 'Grooming', 'Surgery'],
        osmTags: {
          // Simulate OSM tags
          name: mockServiceNames[i % mockServiceNames.length],
          'addr:street': 'Main Street',
          'addr:housenumber': `${Math.floor(Math.random() * 1000) + 100}`
        }
      };
    });
  };

  // Fetch additional details for a service
  const fetchServiceDetails = async (service) => {
    // For OSM data, we'll use the tags we already have
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
    
    // For mock data, just use what we have
    setServiceDetails(service);
  };
  
  // Build an address string from OSM tags
  const buildAddress = (tags) => {
    const parts = [];
    
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:city']) parts.push(tags['addr:city']);
    if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
    if (tags['addr:state']) parts.push(tags['addr:state']);
    
    return parts.join(', ') || 'Address unavailable';
  };
  
  // Generate appropriate services based on OSM tags and category
  const generateServicesFromTags = (tags, categoryId) => {
    if (categoryId === 'vet' || categoryId.includes('vet')) {
      return [
        'Pet Examination',
        'Vaccinations',
        tags.surgery === 'yes' ? 'Surgery' : 'Basic Treatment',
        tags.grooming === 'yes' ? 'Grooming' : 'Health Consultation'
      ];
    } else if (categoryId === 'store' || categoryId.includes('pet')) {
      return [
        'Pet Food',
        'Pet Supplies',
        'Pet Toys',
        tags.grooming === 'yes' ? 'Grooming Services' : 'Pet Accessories'
      ];
    } else {
      return [
        'Pet Boarding',
        'Pet Daycare',
        tags.grooming === 'yes' ? 'Grooming' : 'Pet Exercise',
        'Specialized Care'
      ];
    }
  };

  const handleMarkerPress = (service) => {
    setSelectedService(service);
    setServiceDetails(null); // Clear previous details
    
    // Fetch additional details
    fetchServiceDetails(service);
    
    setModalVisible(true);
  };

  const getDirections = (lat, lng) => {
    if (!selectedService) return;
    
    try {
      // Use device's map app for directions
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

  // Get image for a service
  const getServiceImage = (service) => {
    try {
      // Use predefined category image if available
      if (service.id) {
        const categoryId = service.id.split('-')[1];
        const category = categories.find(cat => cat.id === categoryId);
        if (category && category.placeholderImage) {
          return category.placeholderImage;
        }
      }
      
      // Check for photos
      if (service.photos && service.photos.length > 0) {
        const photo = service.photos[0];
        
        if (!photo) return DEFAULT_IMAGE;
        
        // If photo_reference is a full URL, use it
        if (photo.photo_reference && typeof photo.photo_reference === 'string' && 
            photo.photo_reference.startsWith('http')) {
          return photo.photo_reference;
        }
      }
      
      return DEFAULT_IMAGE;
    } catch (error) {
      console.error('Error getting service image:', error);
      return DEFAULT_IMAGE;
    }
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
        
        {/* Attribution required for OpenStreetMap data */}
        <TouchableOpacity 
          style={styles.attribution}
          onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
        >
          <Text style={styles.attributionText}>© OpenStreetMap</Text>
        </TouchableOpacity>
      </View>

      {/* Category selector */}
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

      {/* Map view */}
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
          attributionEnabled={true} // Shows attribution for map data
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

      {/* Service list */}
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
                    <Text style={[styles.openStatus, 
                      { color: service.opening_hours?.open_now ? colors.success : colors.danger }]}>
                      {service.opening_hours?.open_now ? 'Open Now' : 'Closed'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.grey} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Service detail modal */}
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
                    source={{ uri: getServiceImage(selectedService) }}
                    style={styles.serviceImage}
                    resizeMode="cover"
                    defaultSource={{ uri: DEFAULT_IMAGE }}
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
                  <Text style={[styles.modalOpenStatus, 
                    { color: selectedService.opening_hours?.open_now ? colors.success : colors.danger }]}>
                    {selectedService.opening_hours?.open_now ? 'Open Now' : 'Closed'}
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

                <View style={styles.servicesContainer}>
                  <Text style={styles.servicesTitle}>Services Offered</Text>
                  {(serviceDetails?.services || selectedService.services || ['Pet Services']).map((service, index) => (
                    <View key={index} style={styles.serviceItem}>
                      <Entypo name="dot-single" size={20} color={colors.yellow} />
                      <Text style={styles.serviceText}>{service}</Text>
                    </View>
                  ))}
                </View>
                
                {/* OSM Data Attribution */}
                <View style={styles.attributionContainer}>
                  <Text style={styles.attributionTitle}>Data provided by:</Text>
                  <TouchableOpacity onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}>
                    <Text style={styles.attributionLink}>© OpenStreetMap contributors</Text>
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

const { width, height } = Dimensions.get('window');

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
    marginTop: 10,
    fontSize: 16,
    color: colors.black,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.black,
  },
  attribution: {
    position: 'absolute',
    right: 10,
    bottom: 5,
  },
  attributionText: {
    fontSize: 10,
    color: colors.grey,
  },
  categoryContainer: {
    maxHeight: 60,
    backgroundColor: colors.white,
    paddingVertical: 10,
  },
  categoryContent: {
    paddingHorizontal: 15,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  categoryText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '500',
  },
  map: {
    height: height * 0.4,
    width: width,
  },
  listContainer: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.black,
  },
  list: {
    flex: 1,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.black,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
    color: colors.grey,
    textAlign: 'center',
    marginTop: 5,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  serviceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
  },
  serviceAddress: {
    fontSize: 14,
    color: colors.grey,
    marginTop: 3,
  },
  serviceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  ratingText: {
    fontSize: 12,
    color: colors.black,
    marginLeft: 4,
  },
  openStatus: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 10,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.8,
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: 5,
  },
  modalAddress: {
    fontSize: 16,
    color: colors.grey,
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalRating: {
    fontSize: 14,
    color: colors.black,
    marginLeft: 5,
  },
  modalOpenStatus: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.yellow,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    flexDirection: 'row',
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: '600',
    marginLeft: 5,
  },
  servicesContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  servicesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: 10,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  serviceText: {
    fontSize: 15,
    color: colors.black,
  },
  attributionContainer: {
    marginTop: 20,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    alignItems: 'center',
  },
  attributionTitle: {
    fontSize: 12,
    color: colors.grey,
  },
  attributionLink: {
    fontSize: 12,
    color: colors.primary,
    textDecorationLine: 'underline',
    marginTop: 3,
  },
}); 