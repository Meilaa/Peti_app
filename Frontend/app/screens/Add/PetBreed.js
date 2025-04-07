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
} from 'react-native';
import { useRouter } from 'expo-router';
import RNPickerSelect from 'react-native-picker-select';
import colors from '../../constants/colors';
import AntDesign from '@expo/vector-icons/AntDesign';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.push('..')}
          >
            <Text style={styles.navButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} onPress={handleNext}>
            <Text style={styles.navButtonText}>Next</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Tell Us About Your Pet!</Text>

        <View style={styles.inputWrapper}>
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
                <AntDesign name="down" size={20} color={colors.yellow} style={styles.arrowIcon} />
              )}
            />
          </View>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>How old is your pet?</Text>
          <TextInput
            style={styles.textInput}
            value={age}
            placeholder="Enter age in years..."
            keyboardType="numeric"
            onChangeText={setAge}
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

const breedItems = [
  { label: 'Labrador Retriever', value: 'labrador_retriever' },
  { label: 'German Shepherd', value: 'german_shepherd' },
  { label: 'Golden Retriever', value: 'golden_retriever' },
  { label: 'Mixed', value: 'mixed' },
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
];


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
  pickerContainer: {
    borderRadius: 10,
    marginTop: 5,
  },
  textInput: {
    padding: 10,
    fontSize: 16,
    color: colors.black,
    backgroundColor: colors.white,
    borderRadius: 10,
    width: '100%',
  },
  image: {
    width: 200,
    height: 260,
    marginBottom: 20,
  },
  arrowIcon: {
    position: 'absolute',
    right: 5,
    top: 12,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    backgroundColor: colors.white,
    borderRadius: 10,
    color: colors.black,
    width: '100%',
    paddingVertical: 10,
  },
  inputIOS: {
    fontSize: 16,
    paddingHorizontal: 10,
    backgroundColor: colors.white,
    borderRadius: 10,
    color: colors.black,
    width: '100%',
    paddingVertical: 10,
  },
});

export default DogDetails;
