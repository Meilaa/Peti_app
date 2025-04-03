import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable
} from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import DogImage from '../../../assets/images/dog_pics.png'; // Replace with actual image if necessary
import colors from '../../constants/colors'; // Import colors from your constants folder
import Ionicons from '@expo/vector-icons/Ionicons';

const ActivitySummary = () => {
  const navigation = useNavigation();

  // Modal visibility states
  const [modalVisible1, setModalVisible1] = useState(false);
  const [modalVisible2, setModalVisible2] = useState(false);
  const [modalVisible3, setModalVisible3] = useState(false);

  const openModal1 = () => setModalVisible1(true);
  const closeModal1 = () => setModalVisible1(false);

  const openModal2 = () => setModalVisible2(true);
  const closeModal2 = () => setModalVisible2(false);

  const openModal3 = () => setModalVisible3(true);
  const closeModal3 = () => setModalVisible3(false);

  const handleBack = () => navigation.goBack();

  return (
    <ScrollView style={styles.container}>
      {/* Back Button and Title */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.yellow} />
        </TouchableOpacity>
        <Text style={styles.title}>Activity summary</Text>
      </View>

      {/* Main Activity Box */}
      <View style={styles.mainBox}>
        <View style={styles.centeredContent}>
          <View style={styles.imageContainer}>
            <Image source={DogImage} style={styles.profileImage} />
          </View>
          <Text style={styles.minutesText}>74/60 min</Text>
        </View>
        
        {/* Wrapped Bar Graph and Labels */}
        <View style={styles.barGraphContainer}>
          <View style={styles.barGraph}>
            {Array.from({ length: 4 }).map((_, index) => (
              <View
                key={index}
                style={[styles.bar, { height: (index + 1) * 20 }]}
              />
            ))}
          </View>
          <View style={styles.barLabels}>
            {['0', '6', '12', '18', '24'].map((label, index) => (
              <Text key={index} style={styles.barLabel}>
                {label}
              </Text>
            ))}
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Avg Minutes</Text>
            <Text style={styles.statValue}>57 min</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Calories</Text>
            <Text style={styles.statValue}>942 kcal</Text>
          </View>
        </View>
        <TouchableOpacity onPress={openModal1} style={styles.infoIcon}>
          <FontAwesome6 name="circle-info" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Breed Comparison Box */}
      <Text style={styles.comparisonText}>Breed Comparison</Text>
      <View style={styles.breedComparisonBox}>
        <Text style={styles.percentageText1}>65% </Text>
        <Text style={styles.percentageText}>below average of similar dogs</Text>
        <View style={styles.comparisonLevels}>
          <Text style={[styles.level, styles.activeLevel]}>BELOW</Text>
          <Text style={styles.level}>AVERAGE</Text>
          <Text style={styles.level}>ABOVE</Text>
        </View>
        <TouchableOpacity onPress={openModal2} style={styles.infoIcon}>
          <FontAwesome6 name="circle-info" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Comparison in Minutes Box */}
      <Text style={styles.comparisonText}>Comparison in Minutes</Text>
      <View style={styles.comparisonBox}>
        <Text style={styles.percentageText1}>75 min</Text>
        <Text style={styles.percentageText}>Spraitukas daily average </Text>
        <View style={styles.barGraphContainer1}>
          {/* Second Bar Diagram (modified) */}
          <View style={styles.barGraph1}>
            {Array.from({ length: 5 }).map((_, index) => (
              <View
                key={index}
                style={[styles.bar1, { height: (index + 1) * 25 }]} // Adjust height based on data
              />
            ))}
          </View>
          <View style={styles.barLabels1}>
            {['0 min', '250 min', '500 min'].map((label, index) => (
              <Text key={index} style={styles.barLabel1}>
                {label}
              </Text>
            ))}
          </View>
        </View>
        <View style={styles.leftSideLabelContainer}>
          <Text style={styles.leftSideLabel}>No. of dogs</Text>
        </View>
        <TouchableOpacity onPress={openModal3} style={styles.infoIcon}>
          <FontAwesome6 name="circle-info" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Modal 1 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible1}
        onRequestClose={closeModal1}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Active Time</Text>
              <Pressable onPress={closeModal1}>
                <FontAwesome name="close" size={20} color={colors.yellow} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.infoBox}>
                <Text style={styles.infoHeader}>The chart displays active minutes throughout the day. Daily averages are calculated from past activity, while calorie estimates are based on factors like your pet's type, weight, and size.</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 2 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible2}
        onRequestClose={closeModal2}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Breed Comparison</Text>
              <Pressable onPress={closeModal2}>
                <FontAwesome name="close" size={20} color={colors.yellow} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.infoBox}>
                <Text style={styles.infoHeader}>See how active your dog has been over the past 7 days compared to dogs of a similar age and size.Every dog is unique, but this can help you understand what’s typical for dogs like yours.</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 3 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible3}
        onRequestClose={closeModal3}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comparison in Minutes</Text>
              <Pressable onPress={closeModal3}>
                <FontAwesome name="close" size={20} color={colors.yellow} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.infoBox}>
                <Text style={styles.infoHeader}>This is based on your dog's average activity over the past 7 days, including estimates for times when the tracker wasn't used.The graph shows active minutes for similar dogs, arranged from lowest to highest (left to right). The height of each bar represents the number of dogs who reached a specific amount of active minutes.Tall grey areas highlight what's typical for dogs like yours.</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 13,
  },
  backButton: {
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  mainBox: {
    backgroundColor: colors.yellow,
    borderRadius: 16,
    padding: 16,
    margin: 16,
    marginTop: 10,
    alignItems: 'center', // Center content horizontally
  },
  centeredContent: {
    alignItems: 'center', // Center content horizontally
  },
  imageContainer: {
    width: 65,
    height: 65,
    borderRadius: 50,
    backgroundColor: colors.black,
    borderWidth: 8,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 25,
  },
  minutesText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 12,
  },
  barGraphContainer: {
    width: '95%',
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderColor: colors.black,
    borderWidth: 1,
    borderRadius: 10,
  },
  barGraph: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginHorizontal: 28,
    width: '80%',
  },
  barGraph1: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginHorizontal: 28,
    width: '80%',
    borderLeftWidth: 1.5, // Left border for the second diagram
    borderColor: colors.black,
    paddingLeft: 10, // Padding to give space for the label
  },
  bar: {
    width: 16,
    backgroundColor: colors.yellow,
    borderRadius: 4,
  },
  bar1: {
    width: 16,
    backgroundColor: colors.white,
    borderRadius: 4,
  },
  barLabels: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    paddingTop: 3,
  },
  barLabels1: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    paddingTop: 3,
  },
  barLabel: {
    fontSize: 12,
    color: colors.black,
    textAlign: 'center',
    flex: 1,
  },
  barLabel1: {
    fontSize: 12,
    color: colors.black,
    textAlign: 'center',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 70,
    marginTop: 20,
    width: '95%',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    borderColor: colors.black,
    borderWidth: 1,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingVertical: 5,
  },
  statLabel: {
    fontSize: 13,
    color: colors.yellow,
    paddingBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '650',
    color: colors.black,
  },
  breedComparisonBox: {
    backgroundColor: '#ffa500',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  comparisonText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    flex: 1,
    textAlign: 'center',
  },
  percentageText: {
    fontSize: 13,
    marginBottom: 10,
  },
  percentageText1: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 5,
  },
  comparisonLevels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '95%',
    marginVertical: 10,
  },
  level: {
    fontSize: 13,
    color: colors.black,
  },
  activeLevel: {
    fontWeight: 'bold',
  },
  comparisonBox: {
    backgroundColor: '#ffa500',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  barGroup1: {
    alignItems: 'center',
  },
  infoIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  leftSideLabelContainer: {
    position: 'absolute',
    top: '70%',
    left: -10, // Adjusts the label's position
    transform: [{ translateY: -20 }], // Centers label vertically
  },
  leftSideLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.black,
    transform: [{ rotate: '-90deg' }], // Rotates the label to be vertical
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Blurred background effect
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Keep space between title and icon
    alignItems: 'center',
    marginBottom: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
    textAlign: 'center',
    flex: 1, // This ensures the title takes up the available space
    marginLeft: 5,
    marginTop: 5,
  },
  modalBody: {
    marginTop: 10,
    backgroundColor: colors.yellow,
    borderRadius: 10,
  },
  infoBox: {
    padding: 10,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
  },
  infoHeader: {
    fontSize: 14,
    color: colors.black,
  },
});

export default ActivitySummary;
