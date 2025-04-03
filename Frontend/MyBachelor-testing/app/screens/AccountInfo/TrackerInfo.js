import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import environments from '../../constants/enviroments';
import colors from '../../constants/colors';
import TMT from '../../../assets/images/tmt250.png';
import Ionicons from '@expo/vector-icons/Ionicons';

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
    paddingTop: 30,
  },
  header: {
    position: 'absolute',
    top: 35,
    left: 10,
    zIndex: 1,
  },
  scrollContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  deviceTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
    marginTop: 15, // Position it above the tracker card
  },
  cardContainer: {
    width: '90%',
    marginBottom: 15,
    alignItems: 'center',
  },
  trackerCard: {
    width: '100%',
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: colors.black,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  label: {
    fontSize: 16,
    color: colors.black,
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.yellow,
  },
  imageTMT: {
    width: 200,
    height: 200,
    marginTop: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.yellow,
  },
});

export default TrackerList;