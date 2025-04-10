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
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import colors from '../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import enviroments from '../../constants/enviroments';

const { width, height } = Dimensions.get('window');

// Responsive scaling function
const normalize = (size) => {
  const scale = width / 375; // 375 is the standard iPhone width
  return Math.round(size * scale);
};

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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={() => router.push('..')}>
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleNext}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>We Love All Shapes And Sizes!</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>How tall is your pet?</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              placeholder="Enter height"
              placeholderTextColor={colors.gray}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>How much does your pet weigh?</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="Enter weight"
              placeholderTextColor={colors.gray}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.imageContainer}>
            <Image
              source={require('../../../assets/images/dog_pics.png')}
              style={styles.image}
            />
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.yellow,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? height * 0.05 : height * 0.04,
    paddingBottom: height * 0.05,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '75%',
    marginBottom: height * 0.06,
    marginTop: height * 0.02,
  },
  button: {
    backgroundColor: colors.black,
    paddingVertical: height * 0.008,
    paddingHorizontal: width * 0.05,
    borderRadius: width * 0.06,
    width: width * 0.3,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.yellow,
    fontSize: normalize(16),
    textAlign: 'center',
    paddingBottom: height * 0.005,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: height * 0.05,
    marginBottom: height * 0.04,
  },
  title: {
    fontSize: normalize(28),
    textAlign: 'center',
    color: colors.black,
    marginBottom: height * 0.03,
    fontWeight: '500',
  },
  inputContainer: {
    width: '100%',
    marginBottom: height * 0.05,
    paddingHorizontal: width * 0.06,
  },
  label: {
    fontSize: normalize(16),
    color: colors.black,
    marginBottom: height * 0.02,
    textAlign: 'center',
    fontWeight: '500',
  },
  input: {
    height: height * 0.06,
    borderColor: colors.white,
    borderWidth: 1,
    paddingLeft: width * 0.03,
    backgroundColor: colors.white,
    borderRadius: 10,
    fontSize: normalize(16),
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: height * 0.05,
  },
  image: {
    width: Math.min(width * 0.7, 200),
    height: Math.min(height * 0.3, 260),
    resizeMode: 'contain',
  },
});

export default PetSize;
