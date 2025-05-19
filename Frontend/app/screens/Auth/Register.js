import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import colors from '../../constants/colors';
import enviroments from '../../constants/enviroments';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Responsive scaling function
const normalize = (size) => {
  const scale = width / 375; // 375 is the standard iPhone width
  return size * scale;
};

// Responsive dimensions
const wp = (percentage) => {
  return (width * percentage) / 100;
};

const hp = (percentage) => {
  return (height * percentage) / 100;
};

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
  
    try {
      const response = await fetch(`${enviroments.API_BASE_URL}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, confirmPassword }),
      });
  
      const data = await response.json();
      console.log("Registration Response:", data); // Debugging output
  
      if (response.ok) {
        if (data.token && data.userId) {
          await AsyncStorage.setItem("authToken", data.token);
          await AsyncStorage.setItem("ownerId", data.userId); // ✅ Store ownerId
          console.log("Stored Token:", data.token);
          console.log("Stored Owner ID:", data.userId);
        } else {
          console.error("Missing userId in response");
        }
  
        router.push("/screens/Add/AddTracker");
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Something went wrong. Please try again.");
    }
  };
  
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => router.push('..')}>
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleRegister}>
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Your new account</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} />
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.passwordContainer}>
            <View style={styles.checkboxContainerOne}>
              <Text style={styles.label}>Create password</Text>
              <TextInput
                style={styles.fixedSizeInput}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
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

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            style={styles.fixedSizeInput}
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        <Text style={styles.infoText}>
          Let's keep you and your furry friend's data safe and sound!
        </Text>
        <Text style={styles.infoText1}>
          Create a strong password with at least 10 characters, including uppercase and lowercase letters, a number, and a special symbol.
        </Text>
      </ScrollView>
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
    paddingTop: Platform.OS === 'ios' ? hp(5) : hp(4),
  },
  title: {
    fontSize: normalize(24),
    textAlign: 'center',
    color: colors.black,
    marginVertical: hp(2),
  },
  inputContainer: {
    width: wp(80),
    marginBottom: hp(1.5),
    marginTop: hp(1.5),
  },
  label: {
    fontSize: normalize(16),
    color: colors.black,
    marginBottom: hp(0.5),
  },
  input: {
    height: hp(6),
    borderColor: colors.white,
    borderWidth: 1,
    paddingLeft: wp(2.5),
    backgroundColor: colors.white,
    borderRadius: wp(2),
    fontSize: normalize(16),
  },
  fixedSizeInput: {
    height: hp(6),
    width: Math.min(wp(60), 230),
    borderColor: colors.white,
    borderWidth: 1,
    paddingLeft: wp(2.5),
    backgroundColor: colors.white,
    borderRadius: wp(2),
    fontSize: normalize(16),
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: wp(80),
  },
  checkboxContainerOne: {
    flexDirection: 'column',
  },
  checkboxContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginLeft: wp(4),
  },
  checkbox: {
    width: wp(9),
    height: wp(9),
    borderWidth: 2,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: wp(2),
    marginTop: hp(1),
  },
  checkboxInner: {
    width: wp(4),
    height: wp(4),
    backgroundColor: colors.white,
  },
  showText: {
    fontSize: normalize(16),
    color: colors.black,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: wp(75),
    marginBottom: hp(4),
    marginTop: hp(2),
  },
  button: {
    backgroundColor: colors.black,
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(5),
    borderRadius: wp(6),
    width: wp(30),
    alignItems: 'center',
  },
  buttonText: {
    color: colors.yellow,
    fontSize: normalize(16),
    textAlign: 'center',
    paddingBottom: hp(0.5),
  },
  infoText: {
    fontSize: normalize(16),
    width: wp(80),
    color: colors.black,
    marginBottom: hp(1.5),
  },
  infoText1: {
    fontSize: normalize(16),
    width: wp(80),
    color: colors.black,
    marginBottom: hp(1.5),
  },
});

export default Register;
