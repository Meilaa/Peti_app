import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router'; // Use router from Expo Router

import DogImage from '../../../assets/images/dog_pics.png';
import colors from '../../constants/colors';

const FirstPage = () => {
  const router = useRouter(); // Initialize router

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.back()} // Navigate back
        >
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <Text style={styles.title} testID="titleText">You added device!</Text>
      
      {/* Image */}
      <Image
        source={DogImage}
        style={styles.image}
        testID="dogImage"
      />
      
      {/* "Let's get started" Button */}
      <TouchableOpacity
        style={styles.firstButton}
        onPress={() => router.push('/screens/Home/Home')} // Navigate to Home page
        testID="firstButton"
      >
        <Text style={styles.buttonText}>Let's get started</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,  // Reduced font size for better scaling
    color: colors.black,
    marginBottom: 15,  // Adjusted margin for better fit
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%', // Adjusted width for smaller screens
    position: 'absolute',
    top: 40, // Reduced top margin
    left: 30,
  },
  button: {
    backgroundColor: colors.black,
    paddingVertical: 5, // Reduced vertical padding
    paddingHorizontal: 10, // Adjusted horizontal padding
    borderRadius: 40, // Slightly smaller radius
    width: '30%', // Adjusted button width
  },
  image: {
    width: 200,  // Reduced image width
    height: 260,  // Reduced image height
    resizeMode: 'contain',
    marginBottom: 30,  // Reduced margin at bottom
    paddingTop: 20,  // Adjusted padding
    paddingBottom: 20,  // Adjusted padding
    marginTop: 40,  // Adjusted top margin
  },
  firstButton: {
    backgroundColor: colors.black,
    paddingVertical: 12,  // Reduced padding
    paddingHorizontal: 16,  // Slightly smaller padding
    borderRadius: 25,  // Reduced border radius for smaller button
    marginBottom: 10,  // Reduced margin
    width: '55%',  // Adjusted width for more compact button
    alignItems: 'center',
  },
  buttonText: {
    color: colors.yellow,
    fontSize: 16,  // Smaller font size
    fontWeight: '400',
    textAlign: 'center',
    paddingBottom: 2,
  },
});

export default FirstPage;
