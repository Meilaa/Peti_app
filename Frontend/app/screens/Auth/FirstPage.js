import React, { useLayoutEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import DogImage from '../../../assets/images/dog_pics.png';
import colors from '../../constants/colors';

const FirstPage = () => {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    // This hides the header for the FirstPage
    navigation.setOptions({
      headerShown: false,  // Disable the header on this page
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title} testID="titleText">Let’s get you signed in</Text>
      <Image
        source={DogImage} 
        style={styles.image}
        testID="dogImage"
      />
      <TouchableOpacity
        style={styles.firstButton}
        onPress={() => navigation.navigate('Register')}
        testID="firstButton"
      >
        <Text style={styles.buttonText}>This is my first time</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondButton}
        onPress={() => navigation.navigate('Login')}
        testID="secondButton"
      >
        <Text style={styles.buttonTextAlt}>I have an account already</Text>
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
    fontSize: 24,
    fontWeight: '600',
    color: colors.black,
    marginBottom: 15,
    textAlign: 'center',
  },
  image: {
    width: 200,
    height: 250,
    resizeMode: 'contain',
    marginBottom: 30,
    marginTop: 30,
  },
  firstButton: {
    backgroundColor: colors.black,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 10,
    width: '75%',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.yellow,
    fontSize: 14,
    paddingBottom: 1,
    fontWeight: '500',
  },
  secondButton: {
    borderColor: colors.black,
    borderWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    width: '75%',
    alignItems: 'center',
  },
  buttonTextAlt: {
    color: colors.black,
    fontSize: 14,
    paddingBottom: 1,
    fontWeight: '500',
  },
});

export default FirstPage;
