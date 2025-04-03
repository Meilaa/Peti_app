import React from 'react';
import { Tabs } from 'expo-router';  // Automatically manages routing
import AntDesign from '@expo/vector-icons/AntDesign';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import colors from '../../constants/colors';

export default function _Layout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.yellow, // Set the active tab label color to yellow
        tabBarLabelStyle: { fontSize: 8, marginBottom: 2 }, // Make labels smaller with less bottom margin
        tabBarItemStyle: { paddingHorizontal: 0 }, // Remove horizontal padding completely
        tabBarStyle: { height: 58, paddingBottom: 5 }, // Make tab bar taller for better visibility
      }}
    >
      <Tabs.Screen 
        name="Home" 
        options={{ 
          tabBarIcon: ({ focused }) => {
            return <AntDesign name="home" size={20} color={focused ? colors.yellow : colors.black} />;
          },
          tabBarLabel: 'Home',
          headerShown: false,  // Hide the header
        }} 
      />
      <Tabs.Screen 
        name="Activity" 
        options={{ 
          tabBarIcon: ({ focused }) => {
            return <MaterialCommunityIcons name="dog-service" size={20} color={focused ? colors.yellow : colors.black} />;
          },
          tabBarLabel: 'Activity',
          headerShown: false,  // Hide the header
        }} 
      />
      <Tabs.Screen 
        name="Calendar" 
        options={{ 
          tabBarIcon: ({ focused }) => {
            return <FontAwesome name="calendar" size={18} color={focused ? colors.yellow : colors.black} />;
          },
          tabBarLabel: 'Meds & Vet',
          headerShown: false,  // Hide the header
        }} 
      />
      <Tabs.Screen 
        name="PetServices" 
        options={{ 
          tabBarIcon: ({ focused }) => {
            return <FontAwesome5 name="store" size={18} color={focused ? colors.yellow : colors.black} />;
          },
          tabBarLabel: 'Pet Services',  // Full label
          headerShown: false,  // Hide the header
        }} 
      />
      <Tabs.Screen 
        name="DogProfile" 
        options={{ 
          tabBarIcon: ({ focused }) => {
            return <Ionicons name="paw-outline" size={20} color={focused ? colors.yellow : colors.black} />;
          },
          tabBarLabel: 'Profile',
          headerShown: false,  // Hide the header
        }} 
      />
      <Tabs.Screen 
        name="Profile" 
        options={{ 
          tabBarIcon: ({ focused }) => {
            return <MaterialCommunityIcons name="account-outline" size={20} color={focused ? colors.yellow : colors.black} />;
          },
          tabBarLabel: 'Account',
          headerShown: false,  // Hide the header
        }} 
      />
    </Tabs>
  );
}
