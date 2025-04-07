import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import colors from '../../constants/colors'; 
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';


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
                <Ionicons name="chevron-back" size={24} color={colors.white} />
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
        paddingTop: 30,
        paddingHorizontal   : 15,
    },
    header: {
        position: 'absolute',
        top: 35,
        left: 10,
        zIndex: 1,
      },
    header2: {
        fontSize: 22,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 18,
        marginTop: 15, // Position it above the tracker card
    },
    scrollContainer: {
        paddingBottom: 30,
        borderRadius: 10,
    },
    featureCard: {
        backgroundColor: colors.white,
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 1 },
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.black,
    },
    featureTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.orange,
        marginBottom: 5,
    },
    featureDescription: {
        fontSize: 16,
        color: colors.black,
    },
});

export default FeaturesGuide;
