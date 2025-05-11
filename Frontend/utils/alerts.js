import { Alert } from 'react-native';

export const showFunAlert = (title, message, onPress) => {
  Alert.alert(
    `🎉 ${title} 🎉`,
    `${message}\n\nEnjoy your pawsome experience! 🐾`,
    [
      { text: 'Awesome!', onPress: onPress || (() => {}) }
    ]
  );
};

export const showPaymentAlert = (title, message, onPress) => {
  Alert.alert(
    `💰 ${title}`,
    message,
    [
      { text: 'OK', onPress: onPress || (() => {}) }
    ]
  );
};