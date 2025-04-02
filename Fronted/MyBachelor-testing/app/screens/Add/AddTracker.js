import React, { useState } from 'react';
import { View, TextInput, Image, StyleSheet, Text, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import enviroments from '../../constants/enviroments'; // Make sure you have your API URL in this file
import colors from '../../constants/colors';
import TMT from '../../../assets/images/tmt250.png';

const AddTracker = () => {
  const [trackerID, setTrackerID] = useState('352625692119264');
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
        <View style={styles.inner}>
          {/* Back and Next Buttons */}
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

          {/* Title and Label */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>Enter Tracker ID</Text>
            <Text style={styles.label}>You can find the Tracker ID on the back of your GPS tracker.</Text>
          </View>

          {/* TextInput */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={trackerID} // Using trackerID state
              onChangeText={setTrackerID} // Update the trackerID on input change
              placeholder="Enter your device ID"
              placeholderTextColor={colors.gray}
            />
          </View>

          {/* Image at the Bottom */}
          <View style={styles.imageContainer}>
            <Image
              source={TMT}
              style={styles.imageTMT}
              testID="tmt250"
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.yellow,
    paddingHorizontal: 20,
  },
  inner: {
    flex: 1,
    justifyContent: 'space-between', // Distribute space between elements
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 40,
  },
  button: {
    backgroundColor: colors.black,
    paddingVertical: 4,
    paddingHorizontal: 20,
    borderRadius: 40,
    width: '30%',
  },
  buttonText: {
    color: colors.yellow,
    fontSize: 16,
    textAlign: 'center',
    paddingBottom: 2,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 20, // Adjust this value to position the text
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    color: colors.black,
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    color: colors.black,
    marginBottom: 5,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    height: 45,
    borderColor: colors.white,
    borderWidth: 1,
    paddingLeft: 8,
    backgroundColor: colors.white,
    borderRadius: 8,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20, // Adjust this value to position the image
  },
  imageTMT: {
    width: 240,
    height: 200,
    resizeMode: 'contain',
  },
});

export default AddTracker;