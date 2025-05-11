// App.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StripeProvider } from '@stripe/stripe-react-native';
import LoginScreen from './screens/Auth/Login';
import FirstPage from './screens/Auth/FirstPage';  // Correct path to FirstPage
import RegisterScreen from './screens/Auth/Register';  // Correct path to RegisterScreen
import Activity from './screens/Home/Activity';
import environments from './constants/enviroments';
import { Redirect } from 'expo-router';

// Create a stack navigator
const Stack = createNativeStackNavigator();

const App = () => {
  // Get your publishable key from environment variables or constants
  const stripePublishableKey = environments.STRIPE_PUBLISHABLE_KEY
  return (
    <StripeProvider
      publishableKey={stripePublishableKey}
      merchantIdentifier="merchant.com.peti"
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="FirstPage"
          component={FirstPage}  // First screen of the stack
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}  // Login screen
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}  // Register screen
        />
        <Stack.Screen name="Activity" component={Activity} />
      </Stack.Navigator>
    </StripeProvider>
  );
};

// Default export redirects to the main entry point of your app
export default function Index() {
  return <Redirect href="/screens/Auth/FirstPage" />;
}
