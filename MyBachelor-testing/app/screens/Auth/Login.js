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
} from 'react-native';
import { useRouter } from 'expo-router';
import DogImage from '../../../assets/images/dog_pics.png';
import colors from '../../constants/colors';
import environments from '../../constants/enviroments'; // ✅ Fixed typo
import AsyncStorage from '@react-native-async-storage/async-storage';

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

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Sign in</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotButton}>
          <Text style={styles.forgotText}>I forgot my password</Text>
        </TouchableOpacity>

        <Image source={DogImage} style={styles.image} testID="dogImage" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.yellow,
    marginTop: 10,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 25,
    marginTop: 15,
    color: colors.black,
  },
  inputContainer: {
    width: '85%',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: colors.black,
    marginBottom: 4,
  },
  input: {
    height: 40,
    borderColor: colors.white,
    borderWidth: 1,
    paddingLeft: 8,
    backgroundColor: colors.white,
    borderRadius: 8,
  },
  fixedSizeInput: {
    height: 40,
    width: 230,
    borderColor: colors.white,
    borderWidth: 1,
    paddingLeft: 8,
    backgroundColor: colors.white,
    borderRadius: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '85%',
  },
  checkboxContainerOne: {
    flexDirection: 'column',
  },
  checkboxContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginLeft: 10,
  },
  checkbox: {
    width: 35,
    height: 35,
    borderWidth: 2,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginTop: 5,
  },
  checkboxInner: {
    width: 15,
    height: 15,
    backgroundColor: colors.white,
  },
  showText: {
    fontSize: 14,
    color: colors.black,
  },
  button: {
    backgroundColor: colors.black,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginBottom: 12,
    marginTop: 15,
    width: '85%',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.yellow,
    fontSize: 16,
    paddingBottom: 1,
  },
  forgotButton: {
    borderColor: colors.black,
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 30,
    width: '85%',
    alignItems: 'center',
  },
  forgotText: {
    color: colors.black,
    fontSize: 14,
    fontWeight: '500',
    paddingBottom: 1,
  },
  image: {
    width: 200,
    height: 260,
    marginTop: 25,
  },
});

export default Login;
