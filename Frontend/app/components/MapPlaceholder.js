import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Subcomponents defined first
const Marker = ({ coordinate, title, description, ...props }) => {
  return null; // Placeholder for Marker component
};

const Polyline = ({ coordinates, strokeColor, strokeWidth, ...props }) => {
  return null; // Placeholder for Polyline component
};

const Polygon = ({ coordinates, fillColor, strokeColor, ...props }) => {
  return null; // Placeholder for Polygon component
};

const Callout = (props) => {
  return null; // Placeholder for Callout
};

const Circle = (props) => {
  return null; // Placeholder for Circle
};

// Main MapView component
const MapView = ({ style, children, ...props }) => {
  return (
    <View style={[styles.container, style]} {...props}>
      <Text style={styles.text}>Map View</Text>
      {children}
    </View>
  );
};

// Attach subcomponents
MapView.Marker = Marker;
MapView.Polyline = Polyline;
MapView.Polygon = Polygon;
MapView.Callout = Callout;
MapView.Circle = Circle;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 200,
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
});

export default MapView;
