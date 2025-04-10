import React from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router'; // Use router from Expo Router

import DogImage from '../../../assets/images/dog_pics.png';
import colors from '../../constants/colors';

const { width, height } = Dimensions.get('window');

// Responsive scaling function
const normalize = (size) => {
  const scale = width / 375; // 375 is the standard iPhone width
  return Math.round(size * scale);
};

const FirstPage = () => {
  const router = useRouter(); // Initialize router

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
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
          <View style={styles.textContainer}>
            <Text style={styles.title} testID="titleText">You added device!</Text>
          </View>
          
          {/* Image */}
          <View style={styles.imageContainer}>
            <Image
              source={DogImage}
              style={styles.image}
              testID="dogImage"
            />
          </View>
          
          {/* "Let's get started" Button */}
          <TouchableOpacity
            style={styles.firstButton}
            onPress={() => router.push('/screens/Home/Home')} // Navigate to Home page
            testID="firstButton"
          >
            <Text style={styles.buttonText}>Let's get started</Text>
          </TouchableOpacity>
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
    justifyContent: 'flex-start',
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
  imageContainer: {
    alignItems: 'center',
    marginBottom: height * 0.05,
    marginTop: height * 0.02,
  },
  image: {
    width: Math.min(width * 0.7, 200),
    height: Math.min(height * 0.3, 260),
    resizeMode: 'contain',
  },
  firstButton: {
    backgroundColor: colors.black,
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.05,
    borderRadius: width * 0.06,
    marginBottom: height * 0.05,
    width: width * 0.6,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.yellow,
    fontSize: normalize(16),
    textAlign: 'center',
    paddingBottom: height * 0.005,
  },
});

export default FirstPage;
