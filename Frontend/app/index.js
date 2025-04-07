// App.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/Auth/Login';
import FirstPage from './screens/Auth/FirstPage';  // Correct path to FirstPage
import RegisterScreen from './screens/Auth/Register';  // Correct path to RegisterScreen
import Activity from './screens/Home/Activity';

// Create a stack navigator
const Stack = createNativeStackNavigator();

const App = () => {
  return (
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
  );
};

export default App;
