import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import colors from '../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => router.push('..')}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Now it's time to introduce your bestie!!</Text>
      
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

      <Image source={require('../../../assets/images/dog_pics.png')} style={styles.image} testID="dogImage" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: colors.yellow,
    padding: 15,
  },
  title: {
    fontSize: 24,
    marginTop: 80,
    marginBottom: 15,
    color: colors.black,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    position: 'absolute',
    top: 40,
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
  inputContainer: {
    width: '90%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: colors.black,
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '500',
  },
  input: {
    height: 45,
    borderColor: colors.white,
    borderWidth: 1,
    paddingLeft: 8,
    backgroundColor: colors.white,
    borderRadius: 8,
  },
  genderContainer: {
    width: '90%',
    marginBottom: 10,
  },
  genderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    margin: 5,
    padding: 12,
    borderRadius: 40,
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
    fontSize: 16,
    color: colors.yellow,
    fontWeight: '500',
    paddingBottom: 1,
  },
  unselectedGenderText: {
    fontSize: 16,
    color: colors.black,
    fontWeight: '500',
    paddingBottom: 1,
  },
  image: {
    width: 200,
    height: 260,
  },
});

export default PetInfo;
