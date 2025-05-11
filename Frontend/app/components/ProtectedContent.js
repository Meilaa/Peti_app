import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTrial } from '../contexts/TrialContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../constants/colors';

const ProtectedContent = ({ children, fallback }) => {
  const { trialActive } = useTrial();
  const router = useRouter();
  const [user, setUser] = React.useState(null);
  
  // Load user data on component mount
  React.useEffect(() => {
    const getUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    
    getUser();
  }, []);
  
  const hasActiveSubscription = user?.subscription?.status === 'active';
  const hasAccess = trialActive || hasActiveSubscription;
  
  const handleNavigateToSubscription = () => {
    router.push('/screens/AccountInfo/Payment');
  };
  
  if (hasAccess) {
    return children;
  }
  
  if (fallback) {
    return fallback;
  }
  
  return (
    <View style={styles.upgradeContainer}>
      <Text style={styles.title}>Premium Feature</Text>
      <Text style={styles.message}>
        This feature requires an active subscription or trial.
      </Text>
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleNavigateToSubscription}
      >
        <Text style={styles.buttonText}>Start Trial or Subscribe</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  upgradeContainer: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.black,
  },
  message: {
    fontSize: 14,
    color: colors.grey,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.yellow,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginTop: 10,
  },
  buttonText: {
    color: colors.black,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ProtectedContent; 