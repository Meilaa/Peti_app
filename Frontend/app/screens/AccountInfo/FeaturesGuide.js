import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Platform } from 'react-native';
import colors from '../../constants/colors'; 
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Responsive font size function
const normalize = (size) => {
  const scale = width / 375; // 375 is standard iPhone width
  const newSize = size * scale;
  return Math.round(newSize);
};

const FeaturesGuide = () => {
    const router = useRouter();
    const features = [
        { title: "Track Animals", description: "Monitor your animals' locations in real time using GPS trackers." },
        { title: "Device Management", description: "Easily add, update, or remove trackers assigned to your animals." },
        { title: "Animal Profiles", description: "Store important information about each animal, including health data." },
        { title: "Notifications", description: "Receive alerts when an animal moves out of the designated area." },
        { title: "Secure Access", description: "Your data is protected with secure login and JWT authentication." }
    ];
const handleBack = () => {
    router.back();
    };
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack}>
                <Ionicons name="chevron-back" size={normalize(24)} color={colors.white} />
                </TouchableOpacity>
            </View>
            <Text style={styles.header2}>App Features Guide</Text>
            <ScrollView contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}>
                {features.map((feature, index) => (
                    <View key={index} style={styles.featureCard}>
                        <Text style={styles.featureTitle}>{feature.title}</Text>
                        <Text style={styles.featureDescription}>{feature.description}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.yellow,
        paddingTop: Platform.OS === 'ios' ? height * 0.07 : height * 0.06,
        paddingHorizontal: width * 0.05,
    },
    header: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? height * 0.07 : height * 0.06,
        left: width * 0.04,
        zIndex: 1,
    },
    header2: {
        fontSize: normalize(26),
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: height * 0.025,
        marginTop: height * 0.02,
    },
    scrollContainer: {
        paddingBottom: height * 0.04,
        borderRadius: width * 0.03,
    },
    featureCard: {
        backgroundColor: colors.white,
        padding: width * 0.05,
        borderRadius: width * 0.025,
        marginBottom: height * 0.02,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 1 },
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.black,
    },
    featureTitle: {
        fontSize: normalize(20),
        fontWeight: '600',
        color: colors.orange,
        marginBottom: height * 0.01,
    },
    featureDescription: {
        fontSize: normalize(18),
        color: colors.black,
        lineHeight: normalize(24),
    },
});

export default FeaturesGuide;
