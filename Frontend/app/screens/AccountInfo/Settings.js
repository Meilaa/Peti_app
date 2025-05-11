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
  Platform,
  Dimensions,
} from 'react-native';
import colors from '../../constants/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import environments from '../../constants/enviroments';

const { width, height } = Dimensions.get('window');

const normalize = (size) => {
  const scale = width / 375; // 375 is the standard iPhone width
  return size * scale;
};

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
    paddingTop: Platform.OS === 'ios' ? height * 0.06 : height * 0.05,
    paddingBottom: Platform.OS === 'ios' ? height * 0.06 : height * 0.05,
  },
  scrollContainer: {
    padding: width * 0.05,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? height * 0.06 : height * 0.05,
    left: width * 0.03,
    zIndex: 1,
  },
  title: {
    fontSize: normalize(24),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: height * 0.015,
  },
  section: {
    backgroundColor: colors.yellow,
    padding: width * 0.04,
    borderRadius: width * 0.025,
    marginBottom: height * 0.015,
  },
  sectionTitle: {
    fontSize: normalize(18),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: height * 0.015,
  },
  input: {
    backgroundColor: 'white',
    padding: width * 0.025,
    borderRadius: width * 0.0125,
    marginBottom: height * 0.015,
    width: '100%',
    marginTop: height * 0.01,
    fontSize: normalize(16),
  },
  label: {
    fontSize: normalize(16),
    marginBottom: height * 0.005,
  },
  passwordContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: height * 0.02,
  },
  button: {
    backgroundColor: colors.black,
    paddingVertical: height * 0.015,
    borderRadius: width * 0.12,
    width: width * 0.5,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.yellow,
    fontSize: normalize(16),
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
    width: width * 0.09,
    height: width * 0.09,
    borderWidth: 2,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: width * 0.0125,
    marginTop: height * 0.01,
    marginBottom: height * 0.02,
  },
  checkboxInner: {
    width: width * 0.04,
    height: width * 0.04,
    backgroundColor: colors.white,
  },
  showText: {
    fontSize: normalize(14),
    color: colors.black,
    marginBottom: height * 0.01,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    padding: width * 0.05,
    borderRadius: width * 0.025,
    width: '80%',
  },
  modalText: {
    fontSize: normalize(18),
    marginBottom: height * 0.025,
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalButton: {
    backgroundColor: colors.black,
    paddingVertical: height * 0.015,
    borderRadius: width * 0.12,
    width: '40%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.yellow,
    fontSize: normalize(16),
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default SettingsScreen;
