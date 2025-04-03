import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Platform, Modal } from 'react-native';
import { Calendar as RNCalendar } from 'react-native-calendars';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import environments from '../../constants/environments';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Predefined medication categories with valid Ionicons
const MEDICATION_CATEGORIES = [
  { id: 'pills', label: 'Pills', icon: 'medical-outline' },
  { id: 'liquid', label: 'Liquid', icon: 'water-outline' },
  { id: 'injection', label: 'Injection', icon: 'fitness-outline' },
  { id: 'topical', label: 'Topical', icon: 'bandage-outline' },
  { id: 'other', label: 'Other', icon: 'medkit-outline' },
];

// Predefined vet visit categories with valid Ionicons
const VET_CATEGORIES = [
  { id: 'checkup', label: 'Checkup', icon: 'heart-outline' },
  { id: 'vaccination', label: 'Vaccination', icon: 'shield-outline' },
  { id: 'surgery', label: 'Surgery', icon: 'cut-outline' },
  { id: 'dental', label: 'Dental', icon: 'construct-outline' },
  { id: 'grooming', label: 'Grooming', icon: 'paw-outline' },
];

const Calendar = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [events, setEvents] = useState({});
  const [markedDates, setMarkedDates] = useState({});
  const [currentView, setCurrentView] = useState('calendar'); // 'calendar', 'addEvent', 'eventDetails'
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'medication', // 'medication' or 'vet'
    category: '', // category of medication or vet visit
    time: '',
    notes: '',
    recurrence: 'none', // 'none', 'daily', 'weekly', 'monthly'
    status: 'upcoming', // 'upcoming', 'taken', 'missed'
    petId: '', // ID of the pet this is for (future feature)
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedAmPm, setSelectedAmPm] = useState('AM');
  const [currentMonth, setCurrentMonth] = useState('');
  
  // Load events from storage on component mount
  useEffect(() => {
    loadEvents();
  }, []);
  
  // Update marked dates whenever events change
  useEffect(() => {
    updateMarkedDates();
  }, [events]);
  
  // Request permissions on component mount
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);
  
  // Set current month when component mounts
  useEffect(() => {
    const now = new Date();
    setCurrentMonth(`${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`);
    
    // Set today as the default selected date
    const today = now.toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);
  
  // Updated loadEvents to fetch from backend
  const loadEvents = async () => {
    try {
      console.log('Loading events from AsyncStorage and backend');
      
      // First try to load events from AsyncStorage for immediate display
      const savedEvents = await AsyncStorage.getItem('calendarEvents');
      let eventsToUse = savedEvents ? JSON.parse(savedEvents) : [];
      
      // Set initial state from local storage
      if (eventsToUse.length > 0) {
        setEvents(eventsToUse);
        updateMarkedDates(eventsToUse);
      }
      
      // Then try to fetch from backend
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        return;
      }
      
      try {
        console.log('Fetching events from backend API...');
        const response = await fetch(`${environments.API_BASE_URL}/api/calendar-events`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const backendEvents = await response.json();
          console.log('Successfully loaded events from backend:', backendEvents.length);
          
          // Merge with local events if needed or just use backend events
          eventsToUse = backendEvents;
          
          // Save to AsyncStorage
          await AsyncStorage.setItem('calendarEvents', JSON.stringify(eventsToUse));
          
          // Update state with backend data
          setEvents(eventsToUse);
          updateMarkedDates(eventsToUse);
        } else {
          console.error('Failed to load events from backend:', response.status);
          
          // Try fallback API
          try {
            const fallbackResponse = await fetch(`${environments.FALLBACK_API_BASE_URL}/api/calendar-events`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (fallbackResponse.ok) {
              const fallbackEvents = await fallbackResponse.json();
              console.log('Successfully loaded events from fallback backend:', fallbackEvents.length);
              
              eventsToUse = fallbackEvents;
              await AsyncStorage.setItem('calendarEvents', JSON.stringify(eventsToUse));
              setEvents(eventsToUse);
              updateMarkedDates(eventsToUse);
            } else {
              console.error('Failed to load events from fallback backend:', fallbackResponse.status);
            }
          } catch (fallbackError) {
            console.error('Error loading from fallback backend:', fallbackError);
          }
        }
      } catch (apiError) {
        console.error('Error fetching events from API:', apiError);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };
  
  // Updated saveEvents to sync with backend
  const saveEvents = async (updatedEvents) => {
    try {
      console.log('Saving events to AsyncStorage and backend:', updatedEvents.length);
      
      // Save locally first for immediate UI update
      await AsyncStorage.setItem('calendarEvents', JSON.stringify(updatedEvents));
      setEvents(updatedEvents);
      
      // Now save to the backend
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        return;
      }
      
      // Format events for backend
      const eventsForBackend = updatedEvents.map(event => ({
        id: event.id,
        animalId: event.animalId,
        title: event.title,
        description: event.description || '',
        date: event.date,
        time: event.time,
        type: event.type, // 'medication' or 'vet'
        category: event.category,
        status: event.status,
        recurringPattern: event.recurringPattern || null,
        notificationId: event.notificationId
      }));
      
      console.log('Syncing events with backend...');
      
      // Send to backend API
      const response = await fetch(`${environments.API_BASE_URL}/api/calendar-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ events: eventsForBackend })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Events successfully saved to backend:', result);
      } else {
        console.error('Failed to save events to backend:', response.status);
        
        // Try fallback API
        try {
          const fallbackResponse = await fetch(`${environments.FALLBACK_API_BASE_URL}/api/calendar-events`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ events: eventsForBackend })
          });
          
          if (fallbackResponse.ok) {
            const fallbackResult = await fallbackResponse.json();
            console.log('Events successfully saved to fallback backend:', fallbackResult);
          } else {
            console.error('Failed to save events to fallback backend:', fallbackResponse.status);
          }
        } catch (fallbackError) {
          console.error('Error saving to fallback backend:', fallbackError);
        }
      }
    } catch (error) {
      console.error('Error saving events:', error);
      
      // Still update local state even if backend fails
      setEvents(updatedEvents);
    }
  };
  
  const updateMarkedDates = () => {
    const marked = {};
    
    // Mark dates with events
    Object.keys(events).forEach(date => {
      marked[date] = {
        marked: true,
        dotColor: events[date].some(e => e.type === 'vet') ? colors.blue : colors.yellow
      };
      
      // If this is the selected date, highlight it
      if (date === selectedDate) {
        marked[date] = {
          ...marked[date],
          selected: true,
          selectedColor: colors.yellow
        };
      }
    });
    
    // If selected date has no events, still mark it as selected
    if (selectedDate && !marked[selectedDate]) {
      marked[selectedDate] = {
        selected: true,
        selectedColor: colors.yellow
      };
    }
    
    setMarkedDates(marked);
  };
  
  const handleDateSelect = (day) => {
    setSelectedDate(day.dateString);
  };
  
  const handleAddEvent = () => {
    if (!selectedDate) {
      Alert.alert('Please select a date first');
      return;
    }
    setCurrentView('addEvent');
  };
  
  // Function to request notification permissions
  const registerForPushNotificationsAsync = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert('Notification Permission', 'Notifications are disabled. Please enable them in settings to receive medication and vet appointment reminders.');
        return;
      }
    } catch (error) {
      console.log('Error requesting notification permissions:', error);
    }
  };
  
  // Schedule notification for an event
  const scheduleNotification = async (event) => {
    try {
      // Parse date and time
      const [eventDate, eventTime] = [new Date(event.date), event.time];
      const [hours, minutes] = event.time.split(':');
      
      // Create notification date
      const notificationDate = new Date(eventDate);
      notificationDate.setHours(parseInt(hours));
      notificationDate.setMinutes(parseInt(minutes));
      
      // Check if the date is in the future
      const now = new Date();
      if (notificationDate <= now) {
        console.log('Notification date is in the past, not scheduling');
        return;
      }
      
      // Create notification content
      const content = {
        title: event.type === 'vet' ? 'Vet Appointment Reminder' : 'Medication Reminder',
        body: event.title,
        data: { eventId: event.id },
      };
      
      // Schedule the notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger: notificationDate,
      });
      
      console.log('Scheduled notification:', notificationId);
      
      // Save notification ID with the event for later cancelation if needed
      return notificationId;
    } catch (error) {
      console.log('Error scheduling notification:', error);
      return null;
    }
  };
  
  // Cancel notification for an event
  const cancelNotification = async (notificationId) => {
    if (!notificationId) return;
    
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Canceled notification:', notificationId);
    } catch (error) {
      console.log('Error canceling notification:', error);
    }
  };
  
  // Format time from hours, minutes and AM/PM
  const formatTime = () => {
    return `${selectedHour}:${selectedMinute < 10 ? '0' + selectedMinute : selectedMinute} ${selectedAmPm}`;
  };
  
  // Convert formatted time string back to components
  const parseTime = (timeString) => {
    if (!timeString) return;
    
    const match = timeString.match(/(\d+):(\d+)\s+(AM|PM)/);
    if (match) {
      setSelectedHour(parseInt(match[1], 10));
      setSelectedMinute(parseInt(match[2], 10));
      setSelectedAmPm(match[3]);
    }
  };
  
  // Show custom time picker
  const showTimeSelector = () => {
    if (newEvent.time) {
      parseTime(newEvent.time);
    }
    setShowTimePicker(true);
  };
  
  // Close time picker and save value
  const confirmTime = () => {
    setNewEvent({...newEvent, time: formatTime()});
    setShowTimePicker(false);
  };
  
  // Render custom time picker modal
  const renderTimePicker = () => (
    <Modal
      visible={showTimePicker}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowTimePicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.timePickerContainer}>
          <Text style={styles.timePickerTitle}>Select Time</Text>
          
          <View style={styles.timePickerControls}>
            {/* Hour Picker */}
            <View style={styles.timeColumn}>
              <TouchableOpacity 
                style={styles.timeArrow}
                onPress={() => setSelectedHour(prev => prev === 12 ? 1 : prev + 1)}
              >
                <Ionicons name="chevron-up" size={24} color={colors.yellow} />
              </TouchableOpacity>
              
              <Text style={styles.timeValue}>{selectedHour}</Text>
              
              <TouchableOpacity 
                style={styles.timeArrow}
                onPress={() => setSelectedHour(prev => prev === 1 ? 12 : prev - 1)}
              >
                <Ionicons name="chevron-down" size={24} color={colors.yellow} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.timeSeparator}>:</Text>
            
            {/* Minute Picker */}
            <View style={styles.timeColumn}>
              <TouchableOpacity 
                style={styles.timeArrow}
                onPress={() => setSelectedMinute(prev => prev === 55 ? 0 : prev + 5)}
              >
                <Ionicons name="chevron-up" size={24} color={colors.yellow} />
              </TouchableOpacity>
              
              <Text style={styles.timeValue}>{selectedMinute < 10 ? '0' + selectedMinute : selectedMinute}</Text>
              
              <TouchableOpacity 
                style={styles.timeArrow}
                onPress={() => setSelectedMinute(prev => prev === 0 ? 55 : prev - 5)}
              >
                <Ionicons name="chevron-down" size={24} color={colors.yellow} />
              </TouchableOpacity>
            </View>
            
            {/* AM/PM Picker */}
            <View style={styles.timeColumn}>
              <TouchableOpacity 
                style={styles.timeArrow}
                onPress={() => setSelectedAmPm(prev => prev === 'AM' ? 'PM' : 'AM')}
              >
                <Ionicons name="chevron-up" size={24} color={colors.yellow} />
              </TouchableOpacity>
              
              <Text style={styles.timeValue}>{selectedAmPm}</Text>
              
              <TouchableOpacity 
                style={styles.timeArrow}
                onPress={() => setSelectedAmPm(prev => prev === 'AM' ? 'PM' : 'AM')}
              >
                <Ionicons name="chevron-down" size={24} color={colors.yellow} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.timePickerActions}>
            <TouchableOpacity 
              style={styles.timePickerCancel}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.timePickerCancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.timePickerConfirm}
              onPress={confirmTime}
            >
              <Text style={styles.timePickerConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // Modify handleSaveEvent to schedule notifications
  const handleSaveEvent = async () => {
    // Validate required fields
    if (!newEvent.title || !newEvent.time) {
      Alert.alert('Please fill in all required fields');
      return;
    }
    
    // Create updated events object
    const updatedEvents = { ...events };
    if (!updatedEvents[selectedDate]) {
      updatedEvents[selectedDate] = [];
    }
    
    // Schedule notification
    const notificationId = await scheduleNotification({
      ...newEvent,
      id: Date.now().toString(),
      date: selectedDate
    });
    
    // Add new event with a unique ID and notification ID
    updatedEvents[selectedDate].push({
      ...newEvent,
      id: Date.now().toString(),
      date: selectedDate,
      notificationId
    });
    
    // Save to AsyncStorage
    saveEvents(updatedEvents);
    
    // Reset form and go back to calendar view
    setNewEvent({
      title: '',
      type: 'medication',
      time: '',
      notes: '',
      recurrence: 'none',
      status: 'upcoming'
    });
    setCurrentView('calendar');
  };
  
  const handleViewEvent = (event) => {
    setSelectedEvent(event);
    setCurrentView('eventDetails');
  };
  
  const handleMarkStatus = (event, status) => {
    // Create updated events object
    const updatedEvents = { ...events };
    const dateEvents = updatedEvents[event.date];
    
    // Find and update the event
    const eventIndex = dateEvents.findIndex(e => e.id === event.id);
    if (eventIndex !== -1) {
      dateEvents[eventIndex] = { ...dateEvents[eventIndex], status };
      updatedEvents[event.date] = dateEvents;
      
      // Save to AsyncStorage
      saveEvents(updatedEvents);
      
      // Update selected event if in details view
      if (selectedEvent && selectedEvent.id === event.id) {
        setSelectedEvent({ ...selectedEvent, status });
      }
    }
  };
  
  // Modify handleDeleteEvent to cancel notifications
  const handleDeleteEvent = (event) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            // Cancel the notification if it exists
            if (event.notificationId) {
              await cancelNotification(event.notificationId);
            }
            
            // Create updated events object
            const updatedEvents = { ...events };
            const dateEvents = updatedEvents[event.date];
            
            // Filter out the event to delete
            updatedEvents[event.date] = dateEvents.filter(e => e.id !== event.id);
            
            // If no more events on this date, remove the date entry
            if (updatedEvents[event.date].length === 0) {
              delete updatedEvents[event.date];
            }
            
            // Save to AsyncStorage
            saveEvents(updatedEvents);
            
            // Go back to calendar view
            setCurrentView('calendar');
          }
        }
      ]
    );
  };
  
  // Handle month change
  const handleMonthChange = (month) => {
    const date = new Date(month.dateString);
    setCurrentMonth(`${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`);
  };
  
  // Render calendar view with events for selected date
  const renderCalendarView = () => (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeaderContainer}>
        <Text style={styles.calendarHeaderText}>{currentMonth}</Text>
      </View>
      
      <RNCalendar
        onDayPress={handleDateSelect}
        onMonthChange={handleMonthChange}
        markedDates={markedDates}
        theme={{
          todayTextColor: colors.yellow,
          arrowColor: colors.yellow,
          monthTextColor: colors.darkGrey,
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          textSectionTitleColor: colors.darkGrey,
          selectedDayBackgroundColor: colors.yellow,
          dotColor: colors.yellow,
          selectedDotColor: '#fff',
          dayTextColor: '#000',
        }}
      />
      
      <View style={styles.eventsContainer}>
        <View style={styles.selectedDateHeader}>
          <Text style={styles.selectedDateText}>
            {selectedDate ? new Date(selectedDate).toDateString() : 'Select a date'}
          </Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddEvent}
          >
            <Ionicons name="add-circle" size={30} color={colors.yellow} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.eventsList}>
          {selectedDate && events[selectedDate] && events[selectedDate].length > 0 ? (
            events[selectedDate].map(event => (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.eventCard,
                  event.type === 'vet' ? styles.vetCard : styles.medicationCard,
                  event.status === 'taken' && styles.takenCard,
                  event.status === 'missed' && styles.missedCard
                ]}
                onPress={() => handleViewEvent(event)}
              >
                <View style={styles.eventCardHeader}>
                  <Ionicons 
                    name={event.type === 'vet' ? 'medical' : 'medical-outline'} 
                    size={20} 
                    color={event.type === 'vet' ? colors.blue : colors.yellow} 
                  />
                  <Text style={styles.eventTime}>{event.time}</Text>
                  {event.recurrence !== 'none' && (
                    <Ionicons name="repeat" size={16} color={colors.grey} />
                  )}
                </View>
                
                <Text style={styles.eventTitle}>{event.title}</Text>
                
                {event.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{event.category}</Text>
                  </View>
                )}
                
                {event.status !== 'upcoming' && (
                  <View style={[
                    styles.statusBadge,
                    event.status === 'taken' ? styles.takenBadge : styles.missedBadge
                  ]}>
                    <Text style={[
                      styles.statusText,
                      event.status === 'taken' ? styles.takenStatusText : styles.missedStatusText
                    ]}>
                      {event.status === 'taken' ? 'Taken' : 'Missed'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="calendar-outline" size={50} color={colors.lightGrey} />
              <Text style={styles.emptyStateText}>
                {selectedDate ? 'No reminders for this date' : 'Select a date to view reminders'}
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={handleAddEvent}
              >
                <Text style={styles.emptyStateButtonText}>Add Reminder</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
  
  // Render the add event form
  const renderAddEventForm = () => (
    <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContentContainer}>
      <Text style={styles.formTitle}>Add New Reminder</Text>
      
      <Text style={styles.formLabel}>Date: {new Date(selectedDate).toDateString()}</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Title*</Text>
        <TextInput
          style={styles.textInput}
          value={newEvent.title}
          onChangeText={(text) => setNewEvent({...newEvent, title: text})}
          placeholder="Enter title"
          placeholderTextColor="#999"
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Type</Text>
        <View style={styles.typeButtons}>
          <TouchableOpacity 
            style={[
              styles.typeButton, 
              newEvent.type === 'medication' && styles.activeButton
            ]}
            onPress={() => setNewEvent({...newEvent, type: 'medication', category: ''})}
          >
            <Ionicons 
              name="medical-outline" 
              size={18} 
              color={newEvent.type === 'medication' ? 'white' : colors.darkGrey} 
            />
            <Text style={[
              styles.typeButtonText,
              newEvent.type === 'medication' && { color: 'white', fontWeight: 'bold' }
            ]}>Medication</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.typeButton, 
              newEvent.type === 'vet' && styles.activeButton
            ]}
            onPress={() => setNewEvent({...newEvent, type: 'vet', category: ''})}
          >
            <Ionicons 
              name="medical" 
              size={18} 
              color={newEvent.type === 'vet' ? 'white' : colors.darkGrey} 
            />
            <Text style={[
              styles.typeButtonText,
              newEvent.type === 'vet' && { color: 'white', fontWeight: 'bold' }
            ]}>Vet Visit</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Category</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
        >
          {(newEvent.type === 'medication' ? MEDICATION_CATEGORIES : VET_CATEGORIES).map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                newEvent.category === category.id && styles.activeButton
              ]}
              onPress={() => setNewEvent({...newEvent, category: category.id})}
            >
              <Ionicons 
                name={category.icon} 
                size={18} 
                color={
                  newEvent.category === category.id 
                    ? 'white' 
                    : colors.darkGrey
                } 
              />
              <Text style={[
                styles.categoryButtonText,
                newEvent.category === category.id && { color: 'white', fontWeight: 'bold' }
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Time*</Text>
        <TouchableOpacity 
          style={styles.timePickerButton}
          onPress={showTimeSelector}
        >
          <Text style={styles.timePickerButtonText}>
            {newEvent.time || 'Select Time'}
          </Text>
          <Ionicons name="time-outline" size={24} color={colors.grey} />
        </TouchableOpacity>
        
        {renderTimePicker()}
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Notes</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={newEvent.notes}
          onChangeText={(text) => setNewEvent({...newEvent, notes: text})}
          placeholder="Add notes or instructions"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Repeat</Text>
        <View style={styles.repeatButtons}>
          {['none', 'daily', 'weekly', 'monthly'].map((recurrence) => (
            <TouchableOpacity 
              key={recurrence}
              style={[
                styles.repeatButton, 
                newEvent.recurrence === recurrence && styles.activeButton
              ]}
              onPress={() => setNewEvent({...newEvent, recurrence})}
            >
              <Text style={[
                styles.repeatButtonText,
                newEvent.recurrence === recurrence && { color: 'white', fontWeight: 'bold' }
              ]}>
                {recurrence.charAt(0).toUpperCase() + recurrence.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.saveButton}
        onPress={handleSaveEvent}
      >
        <Text style={styles.saveButtonText}>Save Reminder</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.cancelButton}
        onPress={() => setCurrentView('calendar')}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
  
  // Render event details view
  const renderEventDetails = () => (
    <ScrollView style={styles.detailsContainer} contentContainerStyle={styles.detailsContentContainer}>
      {selectedEvent && (
        <>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>{selectedEvent.title}</Text>
            <View style={styles.detailsTypeContainer}>
              <Ionicons 
                name={selectedEvent.type === 'vet' ? 'medical' : 'medical-outline'} 
                size={22} 
                color={selectedEvent.type === 'vet' ? colors.blue : colors.yellow} 
              />
              <Text style={[
                styles.detailsType,
                {color: selectedEvent.type === 'vet' ? colors.blue : colors.yellow}
              ]}>
                {selectedEvent.type === 'vet' ? 'Vet Appointment' : 'Medication'}
              </Text>
            </View>
            
            {selectedEvent.category && (
              <View style={styles.detailsCategoryContainer}>
                <Text style={styles.detailsCategory}>
                  Category: {
                    (selectedEvent.type === 'medication' 
                      ? MEDICATION_CATEGORIES 
                      : VET_CATEGORIES
                    ).find(c => c.id === selectedEvent.category)?.label || selectedEvent.category
                  }
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.detailsInfo}>
            <View style={styles.detailsRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.grey} />
              <Text style={styles.detailsText}>
                {new Date(selectedEvent.date).toDateString()}
              </Text>
            </View>
            
            <View style={styles.detailsRow}>
              <Ionicons name="time-outline" size={20} color={colors.grey} />
              <Text style={styles.detailsText}>{selectedEvent.time}</Text>
            </View>
            
            {selectedEvent.notes && (
              <View style={styles.detailsRow}>
                <Ionicons name="document-text-outline" size={20} color={colors.grey} />
                <Text style={styles.detailsText}>{selectedEvent.notes}</Text>
              </View>
            )}
            
            {selectedEvent.recurrence !== 'none' && (
              <View style={styles.detailsRow}>
                <Ionicons name="repeat" size={20} color={colors.grey} />
                <Text style={styles.detailsText}>
                  Repeats {selectedEvent.recurrence}
                </Text>
              </View>
            )}
            
            {selectedEvent.status !== 'upcoming' && (
              <View style={[
                styles.detailsStatusContainer,
                selectedEvent.status === 'taken' ? styles.takenStatusContainer : styles.missedStatusContainer
              ]}>
                <Ionicons 
                  name={selectedEvent.status === 'taken' ? 'checkmark-circle' : 'close-circle'} 
                  size={20} 
                  color={selectedEvent.status === 'taken' ? '#4CAF50' : '#F44336'} 
                />
                <Text style={[
                  styles.detailsStatusText,
                  {color: selectedEvent.status === 'taken' ? '#4CAF50' : '#F44336'}
                ]}>
                  {selectedEvent.status === 'taken' ? 'Taken' : 'Missed'}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.actionsContainer}>
            {selectedEvent.type === 'medication' && selectedEvent.status === 'upcoming' && (
              <View style={styles.statusActions}>
                <TouchableOpacity 
                  style={[styles.statusButton, styles.takenButton]}
                  onPress={() => handleMarkStatus(selectedEvent, 'taken')}
                >
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.statusButtonText}>Mark as Taken</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.statusButton, styles.missedButton]}
                  onPress={() => handleMarkStatus(selectedEvent, 'missed')}
                >
                  <Ionicons name="close-circle" size={20} color="white" />
                  <Text style={styles.statusButtonText}>Mark as Missed</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => handleDeleteEvent(selectedEvent)}
            >
              <Ionicons name="trash-outline" size={20} color="white" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setCurrentView('calendar')}
            >
              <Text style={styles.backButtonText}>Back to Calendar</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Medication & Vet Calendar</Text>
      </View>
      
      {currentView === 'calendar' && renderCalendarView()}
      {currentView === 'addEvent' && renderAddEventForm()}
      {currentView === 'eventDetails' && renderEventDetails()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: colors.yellow,
    paddingVertical: 15,
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  calendarContainer: {
    flex: 1,
  },
  calendarHeaderContainer: {
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGrey,
  },
  calendarHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.darkGrey,
  },
  eventsContainer: {
    flex: 1,
    padding: 15,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.darkGrey,
  },
  addButton: {
    padding: 5,
  },
  eventsList: {
    flex: 1,
  },
  eventCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medicationCard: {
    borderLeftColor: colors.yellow,
  },
  vetCard: {
    borderLeftColor: colors.blue,
  },
  takenCard: {
    opacity: 0.7,
  },
  missedCard: {
    opacity: 0.7,
    backgroundColor: '#ffeaea',
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  eventTime: {
    fontSize: 14,
    color: colors.grey,
    marginLeft: 5,
    marginRight: 5,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  categoryBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  categoryText: {
    fontSize: 12,
    color: colors.darkGrey,
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  takenBadge: {
    backgroundColor: '#E8F5E9',
  },
  missedBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
  },
  takenStatusText: {
    color: '#4CAF50',
  },
  missedStatusText: {
    color: '#F44336',
  },
  noEventsText: {
    textAlign: 'center',
    color: colors.grey,
    marginTop: 20,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 15,
    color: colors.darkGrey,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyStateButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.yellow,
    borderRadius: 20,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  formContentContainer: {
    padding: 20,
    paddingBottom: 50,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000',
  },
  formLabel: {
    fontSize: 16,
    marginBottom: 20,
    color: colors.darkGrey,
  },
  formGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.darkGrey,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.lightGrey,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: colors.lightGrey,
    borderRadius: 8,
    width: '48%',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  activeButton: {
    backgroundColor: colors.yellow,
    borderColor: colors.yellow,
  },
  typeButtonText: {
    fontSize: 16,
    marginLeft: 8,
    color: colors.darkGrey,
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.lightGrey,
    borderRadius: 8,
    backgroundColor: '#fff',
    minWidth: 100,
    justifyContent: 'center',
  },
  categoryButtonText: {
    fontSize: 14,
    marginLeft: 5,
    color: '#000',
    textAlign: 'center',
  },
  timePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.lightGrey,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  timePickerButtonText: {
    fontSize: 16,
    color: '#000',
  },
  repeatButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  repeatButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: colors.lightGrey,
    borderRadius: 8,
    width: '23%',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  repeatButtonText: {
    fontSize: 14,
    color: colors.darkGrey,
  },
  saveButton: {
    backgroundColor: colors.yellow,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: colors.grey,
    fontSize: 16,
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  detailsContentContainer: {
    padding: 20,
    paddingBottom: 50,
  },
  detailsHeader: {
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000',
  },
  detailsTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailsType: {
    fontSize: 16,
    marginLeft: 5,
  },
  detailsCategoryContainer: {
    marginTop: 5,
  },
  detailsCategory: {
    fontSize: 14,
    color: colors.darkGrey,
  },
  detailsInfo: {
    marginBottom: 30,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailsText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#000',
  },
  detailsStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  takenStatusContainer: {
    backgroundColor: '#E8F5E9',
  },
  missedStatusContainer: {
    backgroundColor: '#FFEBEE',
  },
  detailsStatusText: {
    marginLeft: 5,
    fontWeight: '500',
  },
  actionsContainer: {
    marginTop: 'auto',
    paddingBottom: 30,
  },
  statusActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    flex: 0.48,
  },
  takenButton: {
    backgroundColor: '#4CAF50',
  },
  missedButton: {
    backgroundColor: '#F44336',
  },
  statusButtonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#FF5722',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  deleteButtonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '500',
  },
  backButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.grey,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000',
  },
  timePickerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  timeColumn: {
    alignItems: 'center',
    width: 60,
  },
  timeArrow: {
    padding: 10,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginVertical: 5,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginHorizontal: 10,
  },
  timePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  timePickerCancel: {
    padding: 10,
  },
  timePickerCancelText: {
    color: colors.grey,
    fontSize: 16,
  },
  timePickerConfirm: {
    padding: 10,
  },
  timePickerConfirmText: {
    color: colors.yellow,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Calendar; 