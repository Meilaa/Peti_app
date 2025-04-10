import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import DogImage from '../../../assets/images/dog_pics.png';
import colors from '../../constants/colors';
import environments from '../../constants/enviroments'; // ✅ Fixed typo
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Responsive font size function
const normalize = (size) => {
  const scale = width / 375; // 375 is standard iPhone width
  const newSize = size * scale;
  return Math.round(newSize);
};

const Login = () => {
  const [email, setEmail] = useState('Meila@gmail.com');
  const [password, setPassword] = useState('Meila123!');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }
  
    try {
      const response = await fetch(`${environments.API_BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
  
      const data = await response.json();
      
      if (response.ok) {
        if (data.token && data.userId) {
          await AsyncStorage.clear(); // Clear existing storage
          await AsyncStorage.setItem('authToken', data.token); // Ensure this is set
          await AsyncStorage.setItem('ownerId', data.userId); // Ensure this is set
          console.log('Token and ownerId stored:', data.token, data.userId);
          router.push('/screens/Home/Home');
        } else {
          alert('No token or userId received. Please try again.');
        }
      } else {
        alert(data.error || 'Invalid email or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Something went wrong. Please try again later.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Let's go outside!</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.passwordContainer}>
              <View style={styles.checkboxContainerOne}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.fixedSizeInput}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.checkboxContainer}>
                <Text style={styles.showText}>Show</Text>
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <View style={[styles.checkbox, showPassword && styles.checkboxChecked]}>
                    {showPassword && <View style={styles.checkboxInner} />}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Sign in</Text>
          </TouchableOpacity>

          <Image 
            source={DogImage} 
            style={styles.image} 
            testID="dogImage" 
            resizeMode="contain"
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: height * 0.04,
    paddingHorizontal: width * 0.06,
  },
  title: {
    fontSize: normalize(28),
    marginBottom: height * 0.04,
    marginTop: height * 0.02,
    color: colors.black,
    fontWeight: '500',
  },
  inputContainer: {
    width: '90%',
    marginBottom: height * 0.02,
  },
  label: {
    fontSize: normalize(16),
    color: colors.black,
    marginBottom: height * 0.01,
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
  fixedSizeInput: {
    height: height * 0.06,
    width: width * 0.65,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  checkboxContainerOne: {
    flexDirection: 'column',
  },
  checkboxContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginLeft: width * 0.03,
  },
  checkbox: {
    width: width * 0.1,
    height: width * 0.1,
    borderWidth: 2,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    marginTop: height * 0.01,
    backgroundColor: colors.white,
  },
  checkboxChecked: {
    backgroundColor: colors.black,
  },
  checkboxInner: {
    width: width * 0.05,
    height: width * 0.05,
    backgroundColor: colors.white,
    borderRadius: 3,
  },
  showText: {
    fontSize: normalize(16),
    color: colors.black,
    fontWeight: '500',
  },
  button: {
    backgroundColor: colors.black,
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.06,
    borderRadius: 30,
    marginBottom: height * 0.02,
    marginTop: height * 0.03,
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
  forgotButton: {
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
  forgotText: {
    color: colors.black,
    fontSize: normalize(16),
    fontWeight: '500',
    paddingBottom: 1,
  },
  image: {
    width: width * 0.55,
    height: height * 0.35,
    marginTop: height * 0.04,
  },
});

export default Login;
