import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getExpoGoWarningState, setExpoGoWarningShown } from './storageUtils';

// SDK 53+ doesn't support push notifications in Expo Go
// This helper provides fallbacks and simulators

// Try to load the dev config, but don't fail if it doesn't exist
let devConfig = { isExpoGo: true, notificationsEnabled: false };
try {
  const loadedConfig = require('./devConfig').default;
  devConfig = loadedConfig;
  console.log('Loaded development configuration:', devConfig);
} catch (e) {
  console.log('Development config not found, using defaults');
}

// Check if we're running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo' || devConfig.isExpoGo;
// For SDK 53+, notifications aren't supported in Expo Go at all
const notificationsSupported = !isExpoGo;

// Add a warning log for unsupported environments
if (isExpoGo) {
  console.warn(
    "expo-notifications: Push notifications are not supported in Expo Go for SDK 53+. Use a development build instead."
  );
}

// Don't try to configure the notification handler in Expo Go for SDK 53+
if (notificationsSupported && !isExpoGo) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    console.log('Notification handler configured successfully');
  } catch (error) {
    console.log('Error configuring notification handler:', error);
  }
}

// Show a warning that we're in simulation mode
export const showExpoGoNotificationsWarning = async () => {
  if (!isExpoGo) return;
  
  try {
    const hasShown = await getExpoGoWarningState();
    if (hasShown) return;
    
    // Show the warning only once
    setTimeout(() => {
      Alert.alert(
        "Notifications Simulated",
        "Push notifications don't work in Expo Go with SDK 53+. You'll see simulated notifications instead. For full functionality, install a production or development build.",
        [
          {
            text: "Don't Show Again", 
            onPress: () => setExpoGoWarningShown(true)
          },
          {
            text: "OK"
          }
        ]
      );
    }, 1000);
  } catch (error) {
    console.log('Error showing Expo Go warning:', error);
  }
};

/**
 * Helper to safely request notification permissions
 * @returns {Promise<boolean>} Whether permissions are granted
 */
export const requestNotificationPermissions = async () => {
  try {
    // In Expo Go with SDK 53+, return simulated permissions
    if (isExpoGo) {
      console.log('Simulating notification permissions in Expo Go with SDK 53+');
      // Show warning once
      showExpoGoNotificationsWarning();
      // Return true to let the app work as if permissions are granted
      return true;
    }

    // Normal permissions flow for non-Expo Go environments
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  } catch (error) {
    console.log('Error requesting notification permissions:', error);
    // In case of error, simulate success in Expo Go
    if (isExpoGo) return true;
    return false;
  }
};

/**
 * Schedule a notification with simulation for Expo Go
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Date} options.date - When to schedule the notification
 * @param {Object} options.data - Additional data to include
 * @returns {Promise<string|null>} Notification ID or null if couldn't schedule
 */
export const scheduleNotification = async ({ title, body, date, data = {} }) => {
  try {
    // In Expo Go, simulate scheduling and show a fake notification
    if (isExpoGo) {
      console.log('Simulating scheduled notification in Expo Go:', { title, body, date });
      
      // Generate a fake notification ID
      const fakeId = `simulated-${Date.now()}`;
      
      // Store the scheduled notification in AsyncStorage
      const scheduledNotifications = await AsyncStorage.getItem('simulatedNotifications') || '[]';
      const notifications = JSON.parse(scheduledNotifications);
      
      notifications.push({
        id: fakeId,
        title,
        body,
        scheduledTime: date.toISOString(),
        data
      });
      
      await AsyncStorage.setItem('simulatedNotifications', JSON.stringify(notifications));
      
      // For testing, if the notification is scheduled to appear soon (within 5 seconds),
      // show a simulated notification alert after a short delay
      const timeUntilNotification = date.getTime() - Date.now();
      
      if (timeUntilNotification <= 5000) {
        setTimeout(() => {
          showSimulatedNotification(title, body, data);
        }, Math.max(500, timeUntilNotification));
      }
      
      // For demo purposes, also show an immediate alert that the notification was scheduled
      Alert.alert(
        "Notification Scheduled",
        `A notification "${title}" has been scheduled for ${date.toLocaleString()}`,
        [{ text: "OK" }]
      );
      
      return fakeId;
    }

    // Real notification scheduling for non-Expo Go
    if (!notificationsSupported) {
      console.log('Notifications not supported in this environment');
      return null;
    }
    
    // Check if date is in the future
    if (date <= new Date()) {
      console.log('Cannot schedule notifications in the past:', date);
      return null;
    }
    
    // Schedule the real notification
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: date,
      });
      
      console.log('Scheduled real notification:', notificationId);
      return notificationId;
    } catch (error) {
      console.log('Error scheduling real notification:', error);
      return null;
    }
  } catch (error) {
    console.log('Error in scheduleNotification:', error);
    return null;
  }
};

/**
 * Cancel a scheduled notification with simulation for Expo Go
 * @param {string} notificationId - ID of the notification to cancel
 * @returns {Promise<void>}
 */
export const cancelNotification = async (notificationId) => {
  if (!notificationId) return;
  
  try {
    // Simulate cancellation in Expo Go
    if (isExpoGo) {
      console.log('Simulating notification cancellation in Expo Go:', notificationId);
      
      const scheduledNotifications = await AsyncStorage.getItem('simulatedNotifications') || '[]';
      const notifications = JSON.parse(scheduledNotifications);
      
      const updatedNotifications = notifications.filter(n => n.id !== notificationId);
      await AsyncStorage.setItem('simulatedNotifications', JSON.stringify(updatedNotifications));
      
      // Show visual feedback that notification was canceled (for demo purposes)
      Alert.alert(
        "Notification Cancelled",
        "The scheduled notification has been cancelled.",
        [{ text: "OK" }]
      );
      
      return;
    }
    
    // Real cancellation for non-Expo Go
    if (notificationsSupported) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Cancelled real notification:', notificationId);
    }
  } catch (error) {
    console.log('Error cancelling notification:', error);
  }
};

/**
 * Show a simulated notification immediately (useful in Expo Go)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional notification data 
 */
export const showSimulatedNotification = (title, body, data = {}) => {
  // Create a nicer looking simulated notification alert
  Alert.alert(
    `📱 ${title}`,
    body,
    [
      { 
        text: "View", 
        onPress: () => {
          // If the notification has action data, you could handle it here
          if (data.action) {
            console.log('Notification action:', data.action);
            // Could trigger navigation or other actions based on data
          }
        } 
      },
      { text: "Dismiss" }
    ],
    { cancelable: true }
  );
};

// Functions to simulate notification API in Expo Go
export const getScheduledNotificationsAsync = async () => {
  if (isExpoGo) {
    const scheduledNotifications = await AsyncStorage.getItem('simulatedNotifications') || '[]';
    return JSON.parse(scheduledNotifications);
  }
  
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.log('Error getting scheduled notifications:', error);
    return [];
  }
};

export const dismissAllNotificationsAsync = async () => {
  if (isExpoGo) {
    await AsyncStorage.removeItem('simulatedNotifications');
    return;
  }
  
  try {
    return await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.log('Error dismissing all notifications:', error);
  }
};

export const getPermissionsAsync = async () => {
  if (isExpoGo) {
    // Simulate granted permissions in Expo Go
    return { status: 'granted', canAskAgain: true };
  }
  
  try {
    return await Notifications.getPermissionsAsync();
  } catch (error) {
    console.log('Error getting permissions:', error);
    return { status: 'error', canAskAgain: false };
  }
};

export const requestPermissionsAsync = async () => {
  if (isExpoGo) {
    // Simulate granted permissions in Expo Go
    return { status: 'granted', canAskAgain: true };
  }
  
  try {
    return await Notifications.requestPermissionsAsync();
  } catch (error) {
    console.log('Error requesting permissions:', error);
    return { status: 'error', canAskAgain: false };
  }
};

// Initialize - show the warning when this module is imported
showExpoGoNotificationsWarning();

export default {
  requestNotificationPermissions,
  scheduleNotification,
  cancelNotification,
  showSimulatedNotification,
  getPermissionsAsync,
  requestPermissionsAsync,
  getScheduledNotificationsAsync,
  dismissAllNotificationsAsync,
  isExpoGo,
  notificationsSupported,
  showExpoGoNotificationsWarning
};