import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  EXPO_GO_WARNING_SHOWN: 'expo_go_warning_shown',
  NOTIFICATION_SETTINGS: 'notification_settings',
};

/**
 * Get the state of whether the Expo Go warning has been shown
 * @returns {Promise<boolean>} Whether the warning has been shown
 */
export const getExpoGoWarningState = async () => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.EXPO_GO_WARNING_SHOWN);
    return value === 'true';
  } catch (error) {
    console.log('Error getting Expo Go warning state:', error);
    return false;
  }
};

/**
 * Set the state of whether the Expo Go warning has been shown
 * @param {boolean} shown - Whether the warning has been shown
 * @returns {Promise<void>}
 */
export const setExpoGoWarningShown = async (shown) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.EXPO_GO_WARNING_SHOWN, shown ? 'true' : 'false');
  } catch (error) {
    console.log('Error setting Expo Go warning state:', error);
  }
};

/**
 * Get notification settings
 * @returns {Promise<Object>} Notification settings
 */
export const getNotificationSettings = async () => {
  try {
    const settings = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
    return settings ? JSON.parse(settings) : {
      enabled: true,
      reminderNotifications: true,
      lostDogNotifications: true,
      safeZoneNotifications: true,
      dangerZoneNotifications: true,
    };
  } catch (error) {
    console.log('Error getting notification settings:', error);
    return {
      enabled: true,
      reminderNotifications: true,
      lostDogNotifications: true,
      safeZoneNotifications: true,
      dangerZoneNotifications: true,
    };
  }
};

/**
 * Save notification settings
 * @param {Object} settings - Notification settings
 * @returns {Promise<void>}
 */
export const saveNotificationSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.log('Error saving notification settings:', error);
  }
};

export default {
  getExpoGoWarningState,
  setExpoGoWarningShown,
  getNotificationSettings,
  saveNotificationSettings,
}; 