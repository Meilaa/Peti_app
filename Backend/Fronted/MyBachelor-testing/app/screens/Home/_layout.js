import React from 'react';
import { Tabs } from 'expo-router';  // Automatically manages routing
import AntDesign from '@expo/vector-icons/AntDesign';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import colors from '../../constants/colors';

export default function _Layout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.yellow, // Set the active tab label color to yellow
      }}
    >
      <Tabs.Screen 
        name="Home" 
        options={{ 
          tabBarIcon: ({ focused }) => {
            return <AntDesign name="home" size={24} color={focused ? colors.yellow : colors.black} />;
          },
          tabBarLabel: 'Home',
          headerShown: false,  // Hide the header
        }} 
      />
      <Tabs.Screen 
        name="Activity" 
        options={{ 
          tabBarIcon: ({ focused }) => {
            return <MaterialCommunityIcons name="dog-service" size={24} color={focused ? colors.yellow : colors.black} />;
          },
          tabBarLabel: 'Activity',
          headerShown: false,  // Hide the header
        }} 
      />
      <Tabs.Screen 
        name="Calendar" 
        options={{ 
          tabBarIcon: ({ focused }) => {
            return <FontAwesome name="calendar" size={22} color={focused ? colors.yellow : colors.black} />;
          },
          tabBarLabel: 'Meds & Vet',
          headerShown: false,  // Hide the header
        }} 
      />
      <Tabs.Screen 
        name="DogProfile" 
        options={{ 
          tabBarIcon: ({ focused }) => {
            return <Ionicons name="paw-outline" size={24} color={focused ? colors.yellow : colors.black} />;
          },
          tabBarLabel: 'Profile',
          headerShown: false,  // Hide the header
        }} 
      />
      <Tabs.Screen 
        name="Profile" 
        options={{ 
          tabBarIcon: ({ focused }) => {
            return <MaterialCommunityIcons name="account-outline" size={24} color={focused ? colors.yellow : colors.black} />;
          },
          tabBarLabel: 'Account',
          headerShown: false,  // Hide the header
        }} 
      />
    </Tabs>
  );
}
