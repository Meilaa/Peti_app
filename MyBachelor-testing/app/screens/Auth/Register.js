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
} from 'react-native';
import { useRouter } from 'expo-router';
import colors from '../../constants/colors';
import enviroments from '../../constants/enviroments';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Register = () => {
  const [username, setUsername] = useState('Meila');
  const [email, setEmail] = useState('Meila@gmail.com');
  const [password, setPassword] = useState('Meila123!');
  const [confirmPassword, setConfirmPassword] = useState('Meila123!');
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
          Let’s keep you and your furry friend’s data safe and sound!
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
    paddingTop: 30,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    color: colors.black,
    marginBottom: 10,
  },
  inputContainer: {
    width: '80%',
    marginBottom: 8,
    marginTop: 8,
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
    width: '80%',
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
    borderRadius: 8,
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '75%',
    marginBottom: 30,
    marginTop: 10,
  },
  button: {
    backgroundColor: colors.black,
    paddingVertical: 4,
    paddingHorizontal: 20,
    borderRadius: 30,
    width: '30%',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.yellow,
    fontSize: 14,
    textAlign: 'center',
    paddingBottom: 2,
  },
  infoText: {
    fontSize: 14,
    width: '80%',
    color: colors.black,
    marginBottom: 8,
  },
  infoText1: {
    fontSize: 14,
    width: '80%',
    color: colors.black,
    marginBottom: 8,
  },
});

export default Register;
