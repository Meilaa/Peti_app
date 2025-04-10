import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, Pressable, ScrollView, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import colors from '../../constants/colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Responsive font size function
const normalize = (size) => {
  const scale = width / 375; // 375 is standard iPhone width
  const newSize = size * scale;
  return Math.round(newSize);
};

const AccountPage = () => {
  const router = useRouter();
  const [isModalVisible, setModalVisible] = useState(false);

  const logout = () => {
    router.push('/screens/Auth/FirstPage');
  };

  // Test alert for DangerZone route
  const testDangerZoneNavigation = () => {
    router.push('/screens/AccountInfo/DangerZone');
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.header}>Account</Text>

        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('screens/AccountInfo/FeaturesGuide')}>
            <View style={styles.iconContainer}>
              <MaterialIcons style={styles.iconDiv} name="menu-book" size={24} color={colors.yellow} />
            </View>
            <Text style={styles.menuText}>Features Guide</Text>
            <MaterialIcons name="arrow-forward-ios" size={20} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setModalVisible(true)}>
            <View style={styles.iconContainer}>
              <MaterialIcons style={styles.iconDiv} name="help-outline" size={24} color={colors.yellow} />
            </View>
            <Text style={styles.menuText}>Help Center</Text>
            <MaterialIcons name="arrow-forward-ios" size={20} color={colors.white} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/screens/AccountInfo/SafeZone')}>
            <View style={styles.iconContainer}>
              <MaterialIcons style={styles.iconDiv} name="location-on" size={24} color={colors.yellow} />
            </View>
            <Text style={styles.menuText}>Safe Zone</Text>
            <MaterialIcons name="arrow-forward-ios" size={20} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/screens/AccountInfo/TrackerInfo')}>
            <View style={styles.iconContainer}>
              <MaterialIcons style={styles.iconDiv} name="rss-feed" size={24} color={colors.yellow} />
            </View>
            <Text style={styles.menuText}>Tracker Info</Text>
            <MaterialIcons name="arrow-forward-ios" size={20} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={testDangerZoneNavigation}>
            <View style={styles.iconContainer}>
              <MaterialIcons style={styles.iconDiv} name="warning" size={24} color={colors.yellow} />
            </View>
            <Text style={styles.menuText}>Danger Zone</Text>
            <MaterialIcons name="arrow-forward-ios" size={20} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem1} onPress={() => router.push('/screens/AccountInfo/Settings')}>
            <View style={styles.iconContainer}>
              <MaterialIcons style={styles.iconDiv} name="settings" size={24} color={colors.yellow} />
            </View>
            <Text style={styles.menuText}>Account Info Settings</Text>
            <MaterialIcons name="arrow-forward-ios" size={20} color={colors.white} />
          </TouchableOpacity>
          
          
        </View>

        <Image source={require('../../../assets/images/dog_pics.png')} style={styles.dogImage} />
        <TouchableOpacity style={styles.logoutButton} onPress={() => router.push('/screens/Auth/FirstPage')}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        <Modal visible={isModalVisible} transparent={true} animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Help Center</Text>
                <Pressable onPress={() => setModalVisible(false)} style={styles.closeButton}>
                  <FontAwesome name="close" size={20} color={colors.yellow} />
                </Pressable>
              </View>
              <Text style={styles.modalSubheader}>Write if you have any questions</Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactText}>Email: meila@gmail.com</Text>
                <Text style={styles.contactText}>GitHub: Meilaa</Text>
                <Text style={styles.contactText}>Linkedin: Meila Andriuškevičiūtė</Text>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { 
    flexGrow: 1 
  },
  container: { 
    flex: 1, 
    backgroundColor: colors.white, 
    padding: width * 0.05, 
    paddingTop: Platform.OS === 'ios' ? height * 0.06 : height * 0.05,
    alignItems: 'center' 
  },
  header: { 
    fontSize: normalize(28), 
    fontWeight: '600', 
    marginVertical: height * 0.025 
  },
  menuContainer: { 
    width: '100%', 
    borderRadius: width * 0.03, 
    padding: width * 0.015, 
    backgroundColor: colors.yellow 
  },
  iconContainer: { 
    borderRadius: width * 0.15, 
    borderWidth: 1, 
    borderColor: colors.black,  
    width: width * 0.11, 
    height: width * 0.11, 
    backgroundColor: colors.white, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  iconDiv: { 
    textAlign: 'center' 
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: colors.yellow, 
    padding: width * 0.04, 
    borderBottomWidth: 1, 
    borderColor: colors.black 
  },
  menuItem1: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: colors.yellow, 
    padding: width * 0.04 
  },
  menuText: { 
    fontSize: normalize(16), 
    fontWeight: '500', 
    color: colors.black, 
    flex: 1, 
    marginHorizontal: width * 0.04 
  },
  dogImage: { 
    width: width * 0.45, 
    height: width * 0.45, 
    resizeMode: 'contain', 
    marginVertical: height * 0.04 
  },
  logoutButton: { 
    backgroundColor: colors.yellow, 
    padding: width * 0.04, 
    borderRadius: width * 0.025, 
    width: '100%', 
    alignItems: 'center' 
  },
  logoutText: { 
    color: colors.black, 
    fontSize: normalize(18), 
    fontWeight: '600' 
  },
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0, 0, 0, 0.5)' 
  },
  modalContent: { 
    width: '90%', 
    maxWidth: width * 0.85,
    backgroundColor: colors.white, 
    borderRadius: width * 0.03, 
    padding: width * 0.05, 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOpacity: 0.25, 
    shadowRadius: 4, 
    shadowOffset: { width: 0, height: 2 }, 
    elevation: 5 
  },
  modalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    width: '100%' 
  },
  modalTitle: { 
    fontSize: normalize(20), 
    fontWeight: '600', 
    textAlign: 'center', 
    flex: 1, 
    marginBottom: height * 0.015
  },
  closeButton: { 
    position: 'absolute', 
    right: -width * 0.015, 
    top: -height * 0.02, 
    padding: width * 0.03 
  },
  modalSubheader: { 
    fontSize: normalize(16), 
    marginBottom: height * 0.015, 
    textAlign: 'center' 
  },
  contactInfo: { 
    alignItems: 'flex-start', 
    width: '100%', 
    backgroundColor: colors.yellow, 
    borderRadius: width * 0.03, 
    padding: width * 0.05, 
    marginHorizontal: width * 0.03 
  },
  contactText: { 
    fontSize: normalize(18), 
    lineHeight: normalize(28) 
  },
  menuItemText: { 
    fontSize: normalize(16), 
    fontWeight: '500', 
    color: colors.black, 
    flex: 1, 
    marginHorizontal: width * 0.04 
  },
});

export default AccountPage;
