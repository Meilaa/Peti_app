import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../constants/colors';

// Get screen dimensions for responsive design
const { width, height } = Dimensions.get('window');

// Responsive font size function
const normalize = (size) => {
  const scale = width / 375; // 375 is standard iPhone width
  const newSize = size * scale;
  return Math.round(newSize);
};

const FeaturesGuide = () => {
  const router = useRouter();

  // Function to render icons based on their type
  const renderIcon = (iconName, iconType) => {
    const iconSize = normalize(24);
    const iconColor = colors.yellow;

    switch (iconType) {
      case 'FontAwesome':
        return <FontAwesome5 name={iconName} size={iconSize} color={iconColor} solid />;
      case 'FontAwesome5':
        return <FontAwesome5 name={iconName} size={iconSize} color={iconColor} />;
      case 'MaterialCommunity':
        return <MaterialCommunityIcons name={iconName} size={iconSize} color={iconColor} />;
      case 'Ionicons':
        return <Ionicons name={iconName} size={iconSize} color={iconColor} />;
      default:
        return <MaterialCommunityIcons name="help-circle" size={iconSize} color={iconColor} />;
    }
  };

  // Features data organized by category
  const features = [
    {
      category: 'Pet Tracking',
      items: [
        {
          title: 'Real-time Location Tracking',
          description: 'Track your pet\'s location in real-time on an interactive map with multiple viewing options (Standard, Satellite, Hybrid).',
          icon: 'map-marker-radius',
          iconType: 'MaterialCommunity'
        },
        {
          title: 'Safe Zones & Territories',
          description: 'Create safe zones for your pet. Receive alerts when your pet leaves designated safe areas.',
          icon: 'shield-check',
          iconType: 'MaterialCommunity'
        },
        {
          title: 'Danger Zones',
          description: 'Be alerted when your pet enters predefined danger zones in your area.',
          icon: 'alert-circle',
          iconType: 'MaterialCommunity'
        },
        {
          title: 'Battery & Connection Status',
          description: 'Monitor your pet tracker\'s battery level and connection status to ensure continuous tracking.',
          icon: 'battery',
          iconType: 'FontAwesome'
        }
      ]
    },
    {
      category: 'Pet Management',
      items: [
        {
          title: 'Multiple Pet Profiles',
          description: 'Add and manage multiple pets with detailed profiles including name, breed, age, weight, and more.',
          icon: 'paw',
          iconType: 'FontAwesome'
        },
        {
          title: 'Temperament Tracking',
          description: 'Indicate your pet\'s temperament (Friendly, Neutral, Aggressive) to help other users.',
          icon: 'dog',
          iconType: 'MaterialCommunity'
        },
        {
          title: 'Lost Pet Reporting',
          description: 'Mark your pet as lost to alert other users in the area. Receive notifications when others spot your pet.',
          icon: 'search',
          iconType: 'FontAwesome'
        },
        {
          title: 'Tracker Management',
          description: 'Register and link tracking devices to your pets, ensuring accurate location data.',
          icon: 'bluetooth',
          iconType: 'FontAwesome'
        }
      ]
    },
    {
      category: 'Health & Care',
      items: [
        {
          title: 'Medication Scheduling',
          description: 'Set up medication reminders with flexible recurrence options (daily, weekly, monthly).',
          icon: 'pills',
          iconType: 'FontAwesome5'
        },
        {
          title: 'Vet Appointments',
          description: 'Schedule and track veterinary visits with categorization (checkup, vaccination, surgery, etc.).',
          icon: 'stethoscope',
          iconType: 'FontAwesome'
        },
        {
          title: 'Activity History',
          description: 'View your pet\'s activity history including walks, playtime, and rest periods.',
          icon: 'running',
          iconType: 'FontAwesome5'
        },
        {
          title: 'Calendar System',
          description: 'All-in-one calendar to manage pet-related events with push notifications and reminders.',
          icon: 'calendar',
          iconType: 'Ionicons'
        }
      ]
    },
    {
      category: 'Community Features',
      items: [
        {
          title: 'Lost & Found Network',
          description: 'Community-based system to help locate lost pets. Receive alerts about lost pets in your area.',
          icon: 'users',
          iconType: 'FontAwesome'
        },
        {
          title: 'Aggressive Pet Alerts',
          description: 'Get notified when aggressive pets are reported in your vicinity for safety.',
          icon: 'exclamation-triangle',
          iconType: 'FontAwesome'
        },
        {
          title: 'Pet Services Directory',
          description: 'Find pet-friendly services near you including vets, groomers, parks, and more.',
          icon: 'store',
          iconType: 'FontAwesome'
        }
      ]
    },
    {
      category: 'Account & Subscription',
      items: [
        {
          title: 'User Profiles',
          description: 'Manage your account details, settings, and preferences.',
          icon: 'user-circle',
          iconType: 'FontAwesome'
        },
        {
          title: 'Premium Subscription',
          description: 'Access advanced features with our affordable subscription plan. Includes all premium tracking features.',
          icon: 'crown',
          iconType: 'FontAwesome5'
        },
        {
          title: 'Free Trial',
          description: 'Try premium features for 14 days before subscribing.',
          icon: 'gift',
          iconType: 'FontAwesome'
        },
        {
          title: 'Secure Payment',
          description: 'Secure subscription payment through Stripe with various payment options.',
          icon: 'credit-card',
          iconType: 'FontAwesome'
        }
      ]
    }
  ];


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={normalize(24)} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Features Guide</Text>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.welcomeText}>
          Welcome to Peti Pet Tracking! Here's everything you can do with our app:
        </Text>

        {features.map((category, index) => (
          <View key={index} style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>{category.category}</Text>
            
            {category.items.map((feature, featureIndex) => (
              <View key={featureIndex} style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  {renderIcon(feature.icon, feature.iconType)}
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  contentContainer: {
    padding: width * 0.05,
    paddingBottom: height * 0.1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: width * 0.05,
    paddingTop: Platform.OS === 'ios' ? height * 0.07 : height * 0.06,
    backgroundColor: colors.yellow,
    position: 'relative',
  },
  backButton: {
    marginRight: width * 0.03,
    position: 'absolute',
    left: width * 0.05,
    zIndex: 1,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: width * 0.06,
  },
  headerTitle: {
    fontSize: normalize(26),
    fontWeight: '600',
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: normalize(16),
    color: colors.black,
    marginBottom: height * 0.03,
    lineHeight: normalize(22),
  },
  categoryContainer: {
    marginBottom: height * 0.04,
  },
  categoryTitle: {
    fontSize: normalize(18),
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: height * 0.02,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.yellow,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: width * 0.04,
    marginBottom: height * 0.02,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  featureIconContainer: {
    width: width * 0.12,
    height: width * 0.12,
    borderRadius: width * 0.06,
    backgroundColor: colors.lightYellow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: width * 0.03,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: normalize(16),
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: normalize(14),
    color: colors.grey,
    lineHeight: normalize(20),
  },
});

export default FeaturesGuide;
