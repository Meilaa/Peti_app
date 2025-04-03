import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import colors from '../../constants/colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const AccountPage = () => {
  const router = useRouter();
  const [isModalVisible, setModalVisible] = useState(false);

  return (
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
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, padding: 16, alignItems: 'center' },
  header: { fontSize: 24, fontWeight: '600', marginVertical: 16 },
  menuContainer: { width: '100%', borderRadius: 10, padding: 3, backgroundColor: colors.yellow },
  iconContainer: { borderRadius: 50, borderWidth:1, borderColor: colors.black,  width: 35, height: 35, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  iconDiv: { textAlign: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.yellow, padding: 12, borderBottomWidth: 1, borderColor: colors.black },
  menuItem1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.yellow, padding: 12 },
  menuText: { fontSize: 14, fontWeight: '500', color: colors.black, flex: 1, marginHorizontal: 12 },
  dogImage: { width: 150, height: 150, resizeMode: 'contain', marginVertical: 24 },
  logoutButton: { backgroundColor: colors.yellow, padding: 12, borderRadius: 8, width: '100%', alignItems: 'center' },
  logoutText: { color: colors.black, fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { width: '90%', backgroundColor: colors.white, borderRadius: 10, padding: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 5 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', flex: 1, marginBottom: 10},
  closeButton: { position: 'absolute', right: -5, top: -13, padding: 10 },
  modalSubheader: { fontSize: 14, marginBottom: 10, textAlign: 'center' },
  contactInfo: { alignItems: 'flex-start', width: '100%', backgroundColor: colors.yellow, borderRadius: 10, padding: 18, marginHorizontal: 10 },
  contactText: { fontSize: 16, lineHeight: 24 },
});

export default AccountPage;
