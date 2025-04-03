import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import colors from '../../constants/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import environments from '../../constants/enviroments';

const SettingsScreen = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [oldEmail, setOldEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldUsername, setOldUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch(`${environments.API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (response.ok) {
          setOldEmail(data.email);
          setOldUsername(data.username);
        } else {
          console.log("Error fetching user details:", data);
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const isEmailValid = !newEmail || newEmail.includes('@');
    const isPasswordValid = !newPassword || newPassword === confirmPassword;
    const isUsernameValid = !newUsername || newUsername.length > 0;
    setIsFormValid((newEmail || newPassword || newUsername) && isEmailValid && isPasswordValid && isUsernameValid);
  }, [newEmail, newPassword, confirmPassword, newUsername]);

  const handleBack = () => {
    router.back();
  };

  const handleSave = () => {
    setIsModalVisible(true);
  };

  const confirmSaveChanges = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert("Error", "No authentication token found");
        return;
      }

      const response = await fetch(`${environments.API_BASE_URL}/api/users/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldEmail, newEmail, oldPassword, newPassword, newUsername }),
      });

      const data = await response.json();
      Alert.alert(response.ok ? "Success" : "Error", data.message || "Failed to update user details");
      setIsModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to update user details");
      setIsModalVisible(false);
    }
  };

  const cancelSaveChanges = () => {
    setIsModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={colors.yellow} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.sectionTitle}>Set new username</Text>
        <View style={styles.section}>
          <Text style={styles.label}>Old username</Text>
          <TextInput style={styles.input} value={oldUsername} editable={false} />
          <Text style={styles.label}>New username</Text>
          <TextInput style={styles.input} value={newUsername} onChangeText={setNewUsername} />
        </View>

        <Text style={styles.sectionTitle}>Set new email</Text>
        <View style={styles.section}>
          <Text style={styles.label}>Old email</Text>
          <TextInput style={styles.input} value={oldEmail} editable={false} />
          <Text style={styles.label}>New email</Text>
          <TextInput style={styles.input} value={newEmail} onChangeText={setNewEmail} />
        </View>

        <Text style={styles.sectionTitle}>Set new password</Text>
        <View style={styles.section}>
          <View style={styles.passwordContainer}>
            <View style={styles.inputWithLabelContainer}>
              <Text style={styles.label}>Enter old password</Text>
              <TextInput 
                style={styles.input} 
                secureTextEntry={!showPassword} 
                value={oldPassword} 
                onChangeText={setOldPassword} 
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

          <Text style={styles.label}>New password</Text>
          <TextInput style={styles.input} secureTextEntry={!showPassword} value={newPassword} onChangeText={setNewPassword} />
          <Text style={styles.label}>Confirm new password</Text>
          <TextInput style={styles.input} secureTextEntry={!showPassword} value={confirmPassword} onChangeText={setConfirmPassword} />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, !isFormValid && styles.disabledButton]} onPress={handleSave} disabled={!isFormValid}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal for confirmation */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelSaveChanges}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Are you sure you want to save these changes?</Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={styles.modalButton} onPress={cancelSaveChanges}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={confirmSaveChanges}>
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightYellow,
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    position: 'absolute',
    top: 20,
    left: 10,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  section: {
    backgroundColor: colors.yellow,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  input: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    width: '100%',
    marginTop: 5,
  },
 
  passwordContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  button: {
    backgroundColor: colors.black,
    paddingVertical: 10,
    borderRadius: 50,
    width: '50%',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.yellow,
    fontSize: 16,
    fontWeight: '600',
  },
  inputWithLabelContainer: {
    width: '80%',
  },
  checkboxContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  checkbox: {
    width: 35,
    height: 35,
    borderWidth: 2,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginTop: 5, // Consistent margin
    marginBottom: 15,
  },
  checkboxInner: {
    width: 15,
    height: 15,
    backgroundColor: colors.white,
  },
  showText: {
    fontSize: 14,
    color: colors.black,
    marginBottom: 5, // Consistent margin
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalButton: {
    backgroundColor: colors.black,
    paddingVertical: 10,
    borderRadius: 50,
    width: '40%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.yellow,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;
