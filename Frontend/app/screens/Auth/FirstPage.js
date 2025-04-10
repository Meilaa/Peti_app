import React, { useLayoutEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import DogImage from '../../../assets/images/dog_pics.png';
import colors from '../../constants/colors';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Responsive font size function
const normalize = (size) => {
  const scale = width / 375; // 375 is standard iPhone width
  const newSize = size * scale;
  return Math.round(newSize);
};

const FirstPage = () => {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    // This hides the header for the FirstPage
    navigation.setOptions({
      headerShown: false,  // Disable the header on this page
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title} testID="titleText">Let's get you signed in</Text>
        <Image
          source={DogImage} 
          style={styles.image}
          testID="dogImage"
          resizeMode="contain"
        />
        <TouchableOpacity
          style={styles.firstButton}
          onPress={() => navigation.navigate('Register')}
          testID="firstButton"
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>This is my first time</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondButton}
          onPress={() => navigation.navigate('Login')}
          testID="secondButton"
          activeOpacity={0.8}
        >
          <Text style={styles.buttonTextAlt}>I have an account already</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.yellow,
  },
  container: {
    flex: 1,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: width * 0.06,
  },
  title: {
    fontSize: normalize(28),
    fontWeight: '500',
    color: colors.black,
    marginBottom: height * 0.04,
    textAlign: 'center',
  },
  image: {
    width: width * 0.55,
    height: height * 0.35,
    marginBottom: height * 0.05,
    marginTop: height * 0.05,
  },
  firstButton: {
    backgroundColor: colors.black,
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.06,
    borderRadius: 30,
    marginBottom: height * 0.02,
    width: '90%',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  buttonText: {
    color: colors.yellow,
    fontSize: normalize(18),
    paddingBottom: 1,
    fontWeight: '500',
  },
  secondButton: {
    borderColor: colors.black,
    borderWidth: 2,
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.06,
    borderRadius: 30,
    width: '90%',
    alignItems: 'center',
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  buttonTextAlt: {
    color: colors.black,
    fontSize: normalize(18),
    paddingBottom: 1,
    fontWeight: '500',
  },
});

export default FirstPage;
