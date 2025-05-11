import React from 'react';
import { View, Text } from 'react-native';

// This is a placeholder component to replace all vector icons
const PlaceholderIcon = ({ name, size = 24, color = 'black', style }) => {
  return (
    <View style={[
      { 
        width: size, 
        height: size, 
        backgroundColor: '#ddd',
        borderRadius: size/2,
        justifyContent: 'center',
        alignItems: 'center'
      }, 
      style
    ]}>
      <Text style={{ fontSize: size/3, color }}>Icon</Text>
    </View>
  );
};

export default PlaceholderIcon; 