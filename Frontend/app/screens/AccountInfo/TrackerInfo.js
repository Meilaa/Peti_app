import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Platform,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import environments from '../../constants/enviroments';
import colors from '../../constants/colors';
import TMT from '../../../assets/images/tmt250.png';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const normalize = (size) => {
  const scale = width / 375; // 375 is the standard iPhone width
  return size * scale * 1; // Increased by 20% for bigger fonts
};

const TrackerList = () => {
  const router = useRouter();
  const [devices, setDevices] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [combinedList, setCombinedList] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleBack = () => {
    router.back();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');

        const [devicesResponse, animalsResponse] = await Promise.all([
          fetch(`${environments.API_BASE_URL}/api/devices`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
          fetch(`${environments.API_BASE_URL}/api/animals`, {
            headers: { 'Authorization': `Bearer ${token}` },
          })
        ]);

        if (!devicesResponse.ok || !animalsResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const devicesData = await devicesResponse.json();
        const animalsData = await animalsResponse.json();

        setDevices(devicesData);
        setAnimals(animalsData);

        // Combine devices with animal names by matching trackerID and deviceId
        const combined = devicesData.map(device => {
          const matchedAnimal = animalsData.find(animal => 
              animal.device && animal.device.deviceId === device.deviceId
          );
          return {
              ...device,
              animalName: matchedAnimal ? matchedAnimal.name : 'Unknown'
          };
      });
      

        setCombinedList(combined);
      } catch (error) {
        console.error('Failed to fetch devices or animals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {combinedList.map((device, index) => (
          <TrackerItem
            key={device.deviceId}
            id={device.deviceId}
            name={device.animalName}
            index={index + 1}
          />
        ))}
        <Image source={TMT} style={styles.imageTMT} />
      </ScrollView>
    </View>
  );
};

const TrackerItem = ({ id, name, index }) => (
  <View style={styles.cardContainer}>
    <Text style={styles.deviceTitle}>Device ({index})</Text>
    <View style={styles.trackerCard}>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Animal</Text>
        <Text style={styles.value}>{name}</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Tracker ID</Text>
        <Text style={styles.value}>{id}</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.yellow,
    paddingTop: Platform.OS === 'ios' ? height * 0.08 : height * 0.07,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? height * 0.08 : height * 0.07,
    left: width * 0.03,
    zIndex: 1,
  },
  scrollContainer: {
    alignItems: 'center',
    paddingBottom: height * 0.03,
  },
  deviceTitle: {
    fontSize: normalize(22),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: height * 0.02,
    marginTop: height * 0.02,
  },
  cardContainer: {
    width: '90%',
    marginBottom: height * 0.02,
    alignItems: 'center',
  },
  trackerCard: {
    width: '100%',
    backgroundColor: colors.white,
    padding: width * 0.04,
    borderRadius: width * 0.02,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: height * 0.002 },
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.black,
    elevation: 3,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: height * 0.006,
  },
  label: {
    fontSize: normalize(18),
    color: colors.black,
  },
  value: {
    fontSize: normalize(18),
    fontWeight: 'bold',
    color: colors.yellow,
  },
  imageTMT: {
    width: width * 0.5,
    height: width * 0.5,
    marginTop: height * 0.04,
    resizeMode: 'contain',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.yellow,
  },
});

export default TrackerList;