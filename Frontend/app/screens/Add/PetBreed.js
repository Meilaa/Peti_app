import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import RNPickerSelect from 'react-native-picker-select';
import colors from '../../constants/colors';
import AntDesign from '@expo/vector-icons/AntDesign';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Responsive scaling function
const normalize = (size) => {
  const scale = width / 375; // 375 is the standard iPhone width
  return Math.round(size * scale);
};

const DogDetails = () => {
  const [breedLabel, setBreedLabel] = useState('');
  const [age, setAge] = useState('');
  const router = useRouter();

  const handleNext = async () => {
    try {
      if (!breedLabel) {
        alert("Please select your pet's breed.");
        return;
      }
      if (!age) {
        alert("Please enter your pet's age.");
        return;
      }
      await AsyncStorage.setItem('dogBreed', breedLabel);
      await AsyncStorage.setItem('dogAge', age);
      
      router.push('./PetSize');
    } catch (error) {
      console.error('Error saving data:', error);
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
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push('..')}
            >
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleNext}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>Tell Us About Your Pet!</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>What is your Pet's Breed?</Text>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={(value, index) => {
                  if (value) {
                    setBreedLabel(breedItems[index - 1].label);
                  }
                }}
                items={breedItems}
                placeholder={{ label: 'Select a breed...', value: null }}
                style={pickerSelectStyles}
                useNativeAndroidPickerStyle={false}
                Icon={() => (
                  <AntDesign name="down" size={normalize(20)} color={colors.black} style={styles.arrowIcon} />
                )}
                touchableWrapperProps={{
                  activeOpacity: 1
                }}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>How old is your pet?</Text>
            <TextInput
              style={styles.input}
              value={age}
              placeholder="Enter age in years..."
              placeholderTextColor={colors.gray}
              keyboardType="numeric"
              onChangeText={setAge}
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

const breedItems = [
  { label: 'Labrador Retriever', value: 'labrador_retriever' },
  { label: 'German Shepherd', value: 'german_shepherd' },
  { label: 'Golden Retriever', value: 'golden_retriever' },
  { label: 'Bulldog', value: 'bulldog' },
  { label: 'Beagle', value: 'beagle' },
  { label: 'Poodle', value: 'poodle' },
  { label: 'Rottweiler', value: 'rottweiler' },
  { label: 'Yorkshire Terrier', value: 'yorkshire_terrier' },
  { label: 'Boxer', value: 'boxer' },
  { label: 'Dachshund', value: 'dachshund' },
  { label: 'Siberian Husky', value: 'siberian_husky' },
  { label: 'Great Dane', value: 'great_dane' },
  { label: 'Doberman Pinscher', value: 'doberman_pinscher' },
  { label: 'Shih Tzu', value: 'shih_tzu' },
  { label: 'Cocker Spaniel', value: 'cocker_spaniel' },
  { label: 'Pug', value: 'pug' },
  { label: 'Chihuahua', value: 'chihuahua' },
  { label: 'Australian Shepherd', value: 'australian_shepherd' },
  { label: 'Border Collie', value: 'border_collie' },
  { label: 'French Bulldog', value: 'french_bulldog' },
  { label: 'Boston Terrier', value: 'boston_terrier' },
  { label: 'Bichon Frise', value: 'bichon_frise' },
  { label: 'Akita', value: 'akita' },
  { label: 'Maltese', value: 'maltese' },
  { label: 'Saint Bernard', value: 'saint_bernard' },
  { label: 'Weimaraner', value: 'weimaraner' },
  { label: 'Newfoundland', value: 'newfoundland' },
  { label: 'Cavalier King Charles Spaniel', value: 'cavalier_king_charles_spaniel' },
  { label: 'Alaskan Malamute', value: 'alaskan_malamute' },
  { label: 'Papillon', value: 'papillon' },
  { label: 'Shar Pei', value: 'shar_pei' },
  { label: 'Shiba Inu', value: 'shiba_inu' },
  { label: 'Basenji', value: 'basenji' },
  { label: 'Whippet', value: 'whippet' },
  { label: 'Airedale Terrier', value: 'airedale_terrier' },
  { label: 'Scottish Terrier', value: 'scottish_terrier' },
  { label: 'Samoyed', value: 'samoyed' },
  { label: 'Pekingese', value: 'pekingese' },
  { label: 'Lhasa Apso', value: 'lhasa_apso' },
  { label: 'Chow Chow', value: 'chow_chow' },
  { label: 'Havanese', value: 'havanese' },
  { label: 'Belgian Malinois', value: 'belgian_malinois' },
  { label: 'Rhodesian Ridgeback', value: 'rhodesian_ridgeback' },
  { label: 'Bernese Mountain Dog', value: 'bernese_mountain_dog' },
  { label: 'Mixed', value: 'mixed' },
];


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
  pickerContainer: {
    borderRadius: 10,
    marginTop: height * 0.01,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.white,
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
  image: {
    width: Math.min(width * 0.7, 200),
    height: Math.min(height * 0.3, 260),
    resizeMode: 'contain',
  },
  arrowIcon: {
    position: 'absolute',
    right: width * 0.03,
    top: height * 0.015,
    zIndex: 1,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputAndroid: {
    fontSize: normalize(16),
    paddingHorizontal: width * 0.03,
    paddingVertical: height * 0.012,
    color: colors.black,
    width: '100%',
    height: height * 0.06,
  },
  inputIOS: {
    fontSize: normalize(16),
    paddingHorizontal: width * 0.03,
    paddingVertical: height * 0.012,
    color: colors.black,
    width: '100%',
    height: height * 0.06,
  },
  placeholder: {
    color: colors.gray,
  },
  viewContainer: {
    width: '100%',
  },
});

export default DogDetails;
