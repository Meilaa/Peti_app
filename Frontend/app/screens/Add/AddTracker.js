import React, { useState } from 'react';
import { View, TextInput, Image, StyleSheet, Text, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import enviroments from '../../constants/enviroments'; // Make sure you have your API URL in this file
import colors from '../../constants/colors';
import TMT from '../../../assets/images/tmt250.png';

const { width, height } = Dimensions.get('window');

// Responsive scaling function
const normalize = (size) => {
  const scale = width / 375; // 375 is the standard iPhone width
  return Math.round(size * scale);
};

// Responsive dimensions
const wp = (percentage) => {
  return (width * percentage) / 100;
};

const hp = (percentage) => {
  return (height * percentage) / 100;
};

const AddTracker = () => {
  const [trackerID, setTrackerID] = useState('');
  const router = useRouter();

  const handleNavigateToHome = async () => {
    if (!trackerID) {
      alert("Please enter a Tracker ID.");
      return;
    }
  
    try {
      const ownerId = await AsyncStorage.getItem("ownerId"); // Retrieve user ID
      const authToken = await AsyncStorage.getItem("authToken"); // ✅ Retrieve auth token (for Authorization header)
  
      if (!ownerId) {
        alert("User authentication failed. Please log in again.");
        return;
      }
  
      if (!authToken) {
        alert("Session expired. Please log in again.");
        return;
      }
  
      console.log("🔹 Sending Tracker ID:", trackerID);
      console.log("🔹 Sending User ID:", ownerId);
  
      const requestPayload = { trackerID, userId: ownerId, animalId: null };
      console.log("Request Payload:", requestPayload);
  
      const response = await fetch(`${enviroments.API_BASE_URL}/api/devices/addTracker`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`, // ✅ Add Authorization header
        },
        body: JSON.stringify(requestPayload),
      });
  
      const data = await response.json();
      console.log("Response Data:", data);
  
      if (response.ok) {
        const trackerObjectId = data?.device?._id;  // ✅ CORRECT
  
        if (trackerObjectId) {
          // ✅ Store objectId instead of trackerID
          await AsyncStorage.setItem("trackerObjectId", trackerObjectId);
          console.log("✅ Stored Tracker Object ID:", trackerObjectId);
  
          // Navigate to next screen
          router.push("./PetInfo");
        } else {
          alert("Failed to get tracker object ID from response.");
        }
      } else {
        alert(data.message || "Failed to save the Tracker ID");
      }
    } catch (error) {
      console.error("❌ Error saving Tracker:", error);
      alert("Something went wrong. Please try again.");
    }
  };
  


  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0} // Adjust this value as needed
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push('..')} // Navigate back to the previous page
            >
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleNavigateToHome}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>Enter Tracker ID</Text>
            <Text style={styles.label}>You can find the Tracker ID on the back of your GPS tracker.</Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={trackerID} // Using trackerID state
              onChangeText={setTrackerID} // Update the trackerID on input change
              placeholder="Enter your device ID"
              placeholderTextColor={colors.gray}
            />
          </View>

          <View style={styles.imageContainer}>
            <Image
              source={TMT}
              style={styles.imageTMT}
              testID="tmt250"
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
    marginHorizontal: width * 0.05,
  },
  title: {
    fontSize: normalize(28),
    textAlign: 'center',
    color: colors.black,
    marginBottom: height * 0.03,
    fontWeight: '500',
  },
  label: {
    fontSize: normalize(16),
    color: colors.black,
    marginBottom: height * 0.02,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputContainer: {
    width: '100%',
    marginBottom: height * 0.05,
    paddingHorizontal: width * 0.06,
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
    marginTop: height * 0.02,
  },
  imageTMT: {
    width: Math.min(width * 0.7, 250),
    height: Math.min(height * 0.25, 210),
    resizeMode: 'contain',
  },
});

export default AddTracker;