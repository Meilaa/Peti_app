import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import colors from '../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import enviroments from '../../constants/enviroments';

const PetSize = () => {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [petData, setPetData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchSavedData = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const ownerId = await AsyncStorage.getItem('ownerId');
        const name = await AsyncStorage.getItem('dogName');
        const gender = await AsyncStorage.getItem('dogGender');
        const breed = await AsyncStorage.getItem('dogBreed');
        const savedAge = await AsyncStorage.getItem('dogAge');
        const trackerID = await AsyncStorage.getItem('trackerObjectId');

        console.log("Retrieved trackerID:", trackerID); // Debug log

        setPetData({
          token,
          ownerId,
          name,
          gender,
          breed,
          age: savedAge,
          trackerID,
        });
      } catch (error) {
        console.error("Error retrieving data:", error);
      }
    };

    fetchSavedData();
  }, []);

  const handleNext = async () => {
    if (!height || !weight || isNaN(height) || isNaN(weight)) {
      alert('Please enter valid height and weight.');
      return;
    }
  
    try {
      const { token, ownerId, name, gender, breed, age, trackerID } = petData || {};
  
      if (!token || !ownerId) {
        alert("Authentication data is missing. Please log in again.");
        return;
      }
  
      if (!trackerID) {
        alert("Tracker ID is missing. Please add a tracker first.");
        return;
      }
  
      console.log("📡 TrackerID being sent:", trackerID);
  
      const petPayload = {
        name,
        gender,
        breed,
        age,
        height,
        weight,
        owner: ownerId,
        device: trackerID, // ✅ Include device ID
      };
  
      console.log("📦 Payload being sent:", petPayload);
  
      const response = await fetch(`${enviroments.API_BASE_URL}/api/animals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(petPayload),
      });
  
      const responseData = await response.json();
  
      if (!response.ok) {
        console.error("❌ Failed to create pet:", responseData);
        alert(responseData.message || "Failed to save pet details.");
        return;
      }
  
      console.log("✅ Pet created successfully:", responseData);
  
      // ✅ Ensure we get the animal ID
      if (!responseData.animal || !responseData.animal._id) {
        console.error("❌ Error: Animal ID missing in response:", responseData);
        alert("Error: Failed to retrieve animal ID.");
        return;
      }
  
      const animalId = responseData.animal._id;
      console.log("📌 Retrieved Animal ID:", animalId);
      await AsyncStorage.setItem("animalId", animalId); // ✅ Save it
  
      // ✅ Now, link the animal to the tracker
      console.log("🔹 Linking tracker to animal...");
      const linkResponse = await fetch(`${enviroments.API_BASE_URL}/api/devices/linkAnimalAfterCreation`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ trackerObjectId: trackerID, animalId }),
      });
  
      const linkResponseData = await linkResponse.json();
  
      if (!linkResponse.ok) {
        console.error("❌ Failed to link device to animal:", linkResponseData);
        alert(linkResponseData.message || "Failed to link device to animal.");
        return;
      }
  
      console.log("✅ Device successfully linked to animal:", linkResponseData);
  
      router.push('./Welcome');
  
    } catch (error) {
      console.error('❌ Error saving data:', error);
      alert('Something went wrong. Please try again.');
    }
  };
  
  

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.navButton} onPress={() => router.push('..')}>
            <Text style={styles.navButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} onPress={handleNext}>
            <Text style={styles.navButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>We Love All Shapes And Sizes!</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>How tall is your pet?</Text>
          <TextInput
            style={styles.textInput}
            value={height}
            onChangeText={setHeight}
            placeholder="Enter height"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>How much does your pet weigh?</Text>
          <TextInput
            style={styles.textInput}
            value={weight}
            onChangeText={setWeight}
            placeholder="Enter weight"
            keyboardType="numeric"
          />
        </View>
        <Image
          source={require('../../../assets/images/dog_pics.png')}
          style={styles.image}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.yellow,
  },
  scrollContent: {
    alignItems: 'center',
    padding: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    position: 'absolute',
    top: 40,
  },
  navButton: {
    backgroundColor: colors.black,
    paddingVertical: 4,
    paddingHorizontal: 20,
    borderRadius: 40,
    width: '30%',
  },
  navButtonText: {
    color: colors.yellow,
    fontSize: 16,
    textAlign: 'center',
    paddingBottom: 2,
  },
  title: {
    fontSize: 24,
    marginTop: 80,
    marginBottom: 15,
    color: colors.black,
    textAlign: 'center',
  },
  inputWrapper: {
    width: '90%',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.black,
    marginBottom: 8,
    textAlign: 'center',
    marginVertical: 8,
  },
  textInput: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.black,
  },
  image: {
    width: 200,
    height: 260,
    marginBottom: 20,
  },
});

export default PetSize;
