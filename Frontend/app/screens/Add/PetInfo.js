import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  Image, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback, 
  Keyboard, 
  ScrollView,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import colors from '../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Responsive scaling function
const normalize = (size) => {
  const scale = width / 375; // 375 is the standard iPhone width
  return Math.round(size * scale);
};

const PetInfo = () => {
  const [petName, setPetName] = useState('Spraitulis');
  const [petGender, setPetGender] = useState(null);
  const router = useRouter();

  const handleNext = async () => {
    if (!petName || !petGender) {
      alert('Please enter your pet\'s name and select a gender.');
      return;
    }

    try {
      await AsyncStorage.setItem('dogName', petName);  // ✅ Save Name
      await AsyncStorage.setItem('dogGender', petGender); // ✅ Save Gender

      router.push('./PetBreed'); // ✅ Move to next screen
    } catch (error) {
      console.error('Error saving pet info:', error);
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
            <Text style={styles.title}>Now it's time to introduce your bestie!!</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>What is your Pet's Name?</Text>
            <TextInput 
              style={styles.input} 
              value={petName} 
              onChangeText={setPetName} 
              placeholder="Enter your pet's name"
              placeholderTextColor={colors.gray}
            />
          </View>

          <View style={styles.genderContainer}>
            <Text style={styles.label}>What is your Pet's Gender?</Text>
            <View style={styles.genderButtons}>
              <TouchableOpacity 
                style={[styles.genderButton, petGender === 'Female' ? styles.selectedGender : styles.unselectedGender]} 
                onPress={() => setPetGender('Female')}
              >
                <Text style={petGender === 'Female' ? styles.selectedGenderText : styles.unselectedGenderText}>Female</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.genderButton, petGender === 'Male' ? styles.selectedGender : styles.unselectedGender]} 
                onPress={() => setPetGender('Male')}
              >
                <Text style={petGender === 'Male' ? styles.selectedGenderText : styles.unselectedGenderText}>Male</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.imageContainer}>
            <Image source={require('../../../assets/images/dog_pics.png')} style={styles.image} testID="dogImage" />
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
    marginBottom: height * 0.03,
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
  genderContainer: {
    width: '100%',
    marginBottom: height * 0.05,
    paddingHorizontal: width * 0.06,
  },
  genderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: width * 0.03,
  },
  genderButton: {
    flex: 1,
    margin: width * 0.01,
    padding: height * 0.015,
    borderRadius: width * 0.1,
    alignItems: 'center',
  },
  selectedGender: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  unselectedGender: {
    backgroundColor: colors.yellow,
    borderColor: colors.black,
    borderWidth: 1,
  },
  selectedGenderText: {
    fontSize: normalize(16),
    color: colors.yellow,
    fontWeight: '500',
    paddingBottom: height * 0.001,
  },
  unselectedGenderText: {
    fontSize: normalize(16),
    color: colors.black,
    fontWeight: '500',
    paddingBottom: height * 0.001,
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
});

export default PetInfo;
