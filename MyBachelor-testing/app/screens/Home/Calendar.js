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
    loadEvents();
  }, []);
  
  // Set current month when component mounts
  useEffect(() => {
    const now = new Date();
    setCurrentMonth(`${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`);
    
    // Set today as the default selected date
    const today = now.toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);
  // Add this useEffect to your component
useEffect(() => {
  const interval = setInterval(() => {
    updateMarkedDates();
  }, 30000); // Refresh every 30 seconds as a fallback

  return () => clearInterval(interval);
}, [events]);
  
  // Updated loadEvents to fetch from backend
  const loadEvents = async () => {
    try {
      console.log('Loading events from AsyncStorage and backend');
  
      // Load events from AsyncStorage
      const savedEvents = await AsyncStorage.getItem('calendarEvents');
      let eventsToUse = savedEvents ? JSON.parse(savedEvents) : {};
  
      // Set initial state from AsyncStorage if events are found
      if (Object.keys(eventsToUse).length > 0) {
        setEvents(eventsToUse);
        updateMarkedDates(eventsToUse); // Mark the dates based on loaded events
      } else {
        console.log('No events found in AsyncStorage');
      }
  
      // Load events from the backend if an auth token exists
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        return;
      }
  
      console.log('Fetching events from backend API...');
      const response = await fetch(`${environments.API_BASE_URL}/api/calendar-events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
  
      if (response.ok) {
        const backendEvents = await response.json();
        console.log('Successfully loaded events from backend:', backendEvents.length);
  
        // Transform backend events into a date-grouped format
        const groupedEvents = backendEvents.reduce((acc, event) => {
          const eventDate = event.date; // Ensure date format is consistent (YYYY-MM-DD)
          if (!acc[eventDate]) {
            acc[eventDate] = [];
          }
          acc[eventDate].push(event);
          return acc;
        }, {});
  
        // Save grouped events into AsyncStorage for future use
        await AsyncStorage.setItem('calendarEvents', JSON.stringify(groupedEvents));
  
        // Update state with backend events
        setEvents(groupedEvents);
        updateMarkedDates(groupedEvents);
      } else {
        console.error('Failed to load events from backend:', response.status);
        // Handle the case where backend fetching fails
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };
  
  
  // Updated saveEvents to sync with backend
  const saveEvents = async (updatedEvents) => {
    try {
      // First save to AsyncStorage
      await AsyncStorage.setItem('calendarEvents', JSON.stringify(updatedEvents));
      setEvents(updatedEvents);
      updateMarkedDates(updatedEvents);
  
      // Then try to sync with backend
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        return;
      }
  
      const eventsForBackend = Object.values(updatedEvents).flat();
  
      try {
        const response = await fetch(`${environments.API_BASE_URL}/api/calendar-events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ events: eventsForBackend }),
        });
  
        if (!response.ok) {
          throw new Error(`Backend error: ${response.status}`);
        }
  
        console.log('Events successfully saved to backend');
      } catch (backendError) {
        console.error('Failed to save to backend, using fallback:', backendError);
        // Implement your fallback logic here
      }
    } catch (error) {
      console.error('Error saving events:', error);
    }
  };
  
  
  const updateMarkedDates = (eventsObject = events) => {
    console.log('Updating marked dates with:', eventsObject);
    
    const newMarkedDates = {};
    
    // First, clear all existing marks
    Object.keys(markedDates).forEach(date => {
      newMarkedDates[date] = { marked: false };
    });
    
    // Then add marks for dates that have events
    Object.entries(eventsObject).forEach(([date, eventList]) => {
      if (eventList && eventList.length > 0) {
        newMarkedDates[date] = { marked: true, dotColor: colors.yellow };
      }
    });
    
    console.log('Final marked dates:', newMarkedDates);
    setMarkedDates(newMarkedDates);
  };
  const handleDateSelect = (day) => {
    if (day?.dateString) {
      setSelectedDate(day.dateString);
    }
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
      const [hours, minutes] = event.time.split(':');
      
      // Create notification date
      const notificationDate = new Date(event.date);
      notificationDate.setHours(parseInt(hours));
      notificationDate.setMinutes(parseInt(minutes));
      
      // Check if the date is in the future
      const now = new Date();
      if (notificationDate <= now) {
        console.log('Notification date is in the past, not scheduling');
        return null;
      }
      
      // Create notification content
      const content = {
        title: event.type === 'vet' ? 'Vet Appointment Reminder' : 'Medication Reminder',
        body: event.title,
        data: { eventId: event.id },
        sound: true, // Ensure sound plays
      };
      
      // Schedule the notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger: notificationDate,
      });
      
      console.log('Scheduled notification:', notificationId);
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
  
// Format time in 24-hour format (no AM/PM)
const formatTime = () => {
  const hour = selectedHour < 10 ? '0' + selectedHour : selectedHour;
  const minute = selectedMinute < 10 ? '0' + selectedMinute : selectedMinute;
  
  // Return formatted time in 24-hour format
  return `${hour}:${minute}`;
};

// Parse time from 24-hour format string
const parseTime = (timeString) => {
  if (!timeString) return;

  // Match 24-hour format time string (HH:MM)
  const match = timeString.match(/(\d+):(\d+)/);
  
  if (match) {
    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    
    // Set the selected hour and minute
    setSelectedHour(hour);
    setSelectedMinute(minute);
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
  setNewEvent({ ...newEvent, time: formatTime() });
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
          {/* Hour Picker (0-23) */}
          <View style={styles.timeColumn}>
            <TouchableOpacity 
              style={styles.timeArrow}
              onPress={() => setSelectedHour(prev => (prev + 1) % 24)}
            >
              <Ionicons name="chevron-up" size={24} color={colors.yellow} />
            </TouchableOpacity>
            
            <Text style={styles.timeValue}>
              {selectedHour < 10 ? '0' + selectedHour : selectedHour}
            </Text>
            
            <TouchableOpacity 
              style={styles.timeArrow}
              onPress={() => setSelectedHour(prev => (prev - 1 + 24) % 24)}
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
            
            <Text style={styles.timeValue}>
              {selectedMinute < 10 ? '0' + selectedMinute : selectedMinute}
            </Text>
            
            <TouchableOpacity 
              style={styles.timeArrow}
              onPress={() => setSelectedMinute(prev => prev === 0 ? 55 : prev - 5)}
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
  
const handleSaveEvent = async () => {
  if (!newEvent.title || !newEvent.time || !selectedDate) {
    alert('Please fill out all required fields.');
    return;
  }

  // Generate unique ID for the event
  const eventId = Date.now().toString();

  const eventData = {
    ...newEvent,
    id: eventId,
    date: selectedDate,
    status: 'upcoming'
  };

  try {
    const savedEvents = await AsyncStorage.getItem('calendarEvents');
    const events = savedEvents ? JSON.parse(savedEvents) : {};

    // Array to store all notification IDs
    const notificationIds = [];

    // Handle recurrence
    if (newEvent.recurrence !== 'none') {
      const startDate = new Date(selectedDate);
      let currentDate = new Date(startDate);
      
      // Determine how many occurrences to create based on recurrence
      const occurrences = newEvent.recurrence === 'daily' ? 30 : 
                         newEvent.recurrence === 'weekly' ? 12 : 
                         newEvent.recurrence === 'monthly' ? 12 : 1;
      
      for (let i = 0; i < occurrences; i++) {
        // Format date as YYYY-MM-DD
        const dateStr = currentDate.toISOString().split('T')[0];
        
        if (!events[dateStr]) {
          events[dateStr] = [];
        }
        
        // Create event with same details but new date
        const recurringEvent = {
          ...eventData,
          id: `${eventId}_${i}`, // Unique ID for each occurrence
          date: dateStr
        };
        
        // Schedule notification for this event
        const notificationId = await scheduleNotification(recurringEvent);
        if (notificationId) {
          recurringEvent.notificationId = notificationId;
          notificationIds.push(notificationId);
        }
        
        events[dateStr].push(recurringEvent);
        
        // Increment date based on recurrence
        if (newEvent.recurrence === 'daily') {
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (newEvent.recurrence === 'weekly') {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (newEvent.recurrence === 'monthly') {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }
    } else {
      // No recurrence - just add single event
      if (!events[selectedDate]) {
        events[selectedDate] = [];
      }
      
      // Schedule notification for this single event
      const notificationId = await scheduleNotification(eventData);
      if (notificationId) {
        eventData.notificationId = notificationId;
        notificationIds.push(notificationId);
      }
      
      events[selectedDate].push(eventData);
    }

    // Save updated events
    await AsyncStorage.setItem('calendarEvents', JSON.stringify(events));

    // Update state and marked dates
    setEvents(events);
    updateMarkedDates(events);
    
    // Sync with backend
    await saveEvents(events);

    // Show success message with notification info
    if (notificationIds.length > 0) {
      Alert.alert(
        'Reminder Set', 
        'Your reminder has been saved and notifications have been scheduled.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Reminder Set', 
        'Your reminder has been saved but no notifications were scheduled (time may be in the past).',
        [{ text: 'OK' }]
      );
    }

    setCurrentView('calendar');
    setNewEvent({
      title: '',
      type: 'medication',
      category: '',
      time: '',
      notes: '',
      recurrence: 'none',
      status: 'upcoming',
      petId: '',
    });
  } catch (error) {
    console.error('Error saving event:', error);
    Alert.alert('Error', 'Failed to save event');
  }
};
  
  const handleViewEvent = (event) => {
    setSelectedEvent(event);
    setCurrentView('eventDetails');
  };
  
  const handleMarkStatus = (event, status) => {
    // Check if event and event.date exist
    if (!event || !event.date) {
      console.error("Event or event.date is missing");
      return;
    }
  
    // Clone the events state
    const updatedEvents = { ...events };
  
    // Ensure the dateEvents array exists in updatedEvents
    const dateEvents = updatedEvents[event.date] || [];
    
    // Find the event in the dateEvents array
    const eventIndex = dateEvents.findIndex(e => e.id === event.id);
  
    if (eventIndex !== -1) {
      // Update the status of the event
      dateEvents[eventIndex] = { ...dateEvents[eventIndex], status };
      updatedEvents[event.date] = dateEvents;
      
      // Save the updated events to AsyncStorage
      saveEvents(updatedEvents)
        .then(() => {
          // Optional: Notify the user that the status was saved
          console.log("Event status updated and saved.");
  
          // Update the selected event if it's in the details view
          if (selectedEvent && selectedEvent.id === event.id) {
            setSelectedEvent({ ...selectedEvent, status });
          }
  
          // Optionally, re-render the calendar or related view
          // For example: setEvents(updatedEvents); 
        })
        .catch((error) => {
          console.error("Error saving events:", error);
        });
    } else {
      console.error("Event not found in date events.");
    }
  };
  
  const handleDeleteEvent = async (event) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?' + 
      (event.recurrence !== 'none' ? ' This will delete all occurrences of this recurring event.' : ''),
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              if (!token) {
                Alert.alert('Error', 'Not authenticated');
                return;
              }
  
              // Ensure events are available in the local state
              let updatedEvents = { ...events };
  
              // If it's a recurring event, we need to delete all occurrences
              if (event.recurrence !== 'none') {
                const baseEventId = event.id.split('_')[0];
                let eventsToDelete = [];
  
                // Iterate through all dates in events to filter occurrences
                for (const date in updatedEvents) {
                  updatedEvents[date] = updatedEvents[date].filter(e => {
                    if (e.id.startsWith(baseEventId)) {
                      eventsToDelete.push(e);
                      return false;
                    }
                    return true;
                  });
  
                  // Remove date entry if no events are left for that date
                  if (updatedEvents[date].length === 0) {
                    delete updatedEvents[date];
                  }
                }
  
                // Backend deletion for recurring events
                try {
                  const deleteResponse = await fetch(
                    `${environments.API_BASE_URL}/api/calendar-events/${event.id}?deleteAllRecurring=true`, 
                    {
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${token}` },
                    }
                  );
  
                  if (!deleteResponse.ok) {
                    throw new Error('Failed to delete recurring events from backend');
                  }
                } catch (backendError) {
                  console.error('Error deleting recurring events from backend:', backendError);
                }
  
                // Cancel notifications for events to delete
                for (const e of eventsToDelete) {
                  if (e.notificationId) {
                    await cancelNotification(e.notificationId);
                  }
                }
              } else {
                // Handle non-recurring event deletion
                const deleteResponse = await fetch(
                  `${environments.API_BASE_URL}/api/calendar-events/${event.id}`, 
                  {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                  }
                );
  
                if (!deleteResponse.ok) {
                  throw new Error('Failed to delete from backend');
                }
  
                if (event.notificationId) {
                  await cancelNotification(event.notificationId);
                }
  
                // Update local state for non-recurring event deletion
                if (updatedEvents[event.date]) {
                  updatedEvents[event.date] = updatedEvents[event.date].filter(e => e.id !== event.id);
                  if (updatedEvents[event.date].length === 0) {
                    delete updatedEvents[event.date];
                  }
                }
              }
  
              // Update AsyncStorage and local UI state
              await AsyncStorage.setItem('calendarEvents', JSON.stringify(updatedEvents));
              setEvents(updatedEvents);
              updateMarkedDates(updatedEvents); // Explicitly update marked dates
              setCurrentView('calendar');
              
              Alert.alert('Success', 'Event(s) deleted successfully');
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete event(s)');
            }
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

  const renderCalendarView = () => (
    <View style={styles.calendarContainer}>
      {/* Calendar View */}
      <RNCalendar
        onDayPress={handleDateSelect}  // When a day is selected
        onMonthChange={handleMonthChange}  // When month changes
        markedDates={markedDates}  // Dates to be marked
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
  
      {/* Events Container */}
      <View style={styles.eventsContainer}>
        <View style={styles.selectedDateHeader}>
          <Text style={styles.selectedDateText}>
            {selectedDate ? new Date(selectedDate).toDateString() : 'Select a date'}
          </Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddEvent}  // Open Add Event form
          >
            <Ionicons name="add-circle" size={30} color={colors.yellow} />
          </TouchableOpacity>
        </View>
  
        <ScrollView style={styles.eventsList}>
          {/* Check if there are events for the selected date */}
          {selectedDate && events[selectedDate] && events[selectedDate].length > 0 ? (
            events[selectedDate].map(event => (
              <TouchableOpacity
                key={event.id}  // Ensure you have a unique key
                style={[
                  styles.eventCard,
                  event.type === 'vet' ? styles.vetCard : styles.medicationCard,
                  event.status === 'taken' && styles.takenCard,
                  event.status === 'missed' && styles.missedCard,
                ]}
                onPress={() => handleViewEvent(event)}  // Handle view event
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
  
                {/* Show status if event is not upcoming */}
                {event.status !== 'upcoming' && (
                  <View style={[
                    styles.statusBadge,
                    event.status === 'taken' ? styles.takenBadge : styles.missedBadge,
                  ]}>
                    <Text style={[
                      styles.statusText,
                      event.status === 'taken' ? styles.takenStatusText : styles.missedStatusText,
                    ]}>
                      {event.status === 'taken' ? 'Taken' : 'Missed'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            // If no events are available for selected date
            <View style={styles.emptyStateContainer}>
              <Ionicons name="calendar-outline" size={50} color={colors.lightGrey} />
              <Text style={styles.emptyStateText}>
                {selectedDate ? 'No reminders for this date' : 'Select a date to view reminders'}
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={handleAddEvent}  // Open Add Event form
              >
                <Text style={styles.emptyStateButtonText}>Add Reminder</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
  

const renderAddEventForm = () => (
  <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContentContainer}>
    <Text style={styles.formTitle}>Add New Reminder</Text>

    <Text style={styles.formLabel}>
      Date: {new Date(selectedDate).toISOString().split('T')[0]}
    </Text>

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
              color={newEvent.category === category.id ? 'white' : colors.darkGrey} 
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
        {/* Move Back to Calendar Button to the Top */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setCurrentView('calendar')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.detailsHeader}>
          <Text style={styles.detailsTitle}>{selectedEvent.title}</Text>
          <View style={styles.detailsTypeContainer}>
            <Ionicons 
              name={selectedEvent.type === 'vet' ? 'medical' : 'medical-outline'} 
              size={22} 
              color={colors.white} 
            />
            <Text style={[styles.detailsType, {color: selectedEvent.type === 'vet' ? colors.white : colors.white}]}>
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

          <View style={styles.detailsRow}>
            <Ionicons name="repeat" size={20} color={colors.grey} />
            <Text style={styles.detailsText}>
              Repeat: {selectedEvent.recurrence || 'None'}
            </Text>
          </View>
        </View>

        {/* Edit or Delete buttons */}
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeleteEvent(selectedEvent)}  // Pass the entire event object
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
              </>
    )}
  </ScrollView>
);

  return (
    <ScrollView style={{ flex: 1 }}>
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pets Calendar</Text>
      </View>

      {currentView === 'calendar' && renderCalendarView()}
      {currentView === 'addEvent' && renderAddEventForm()}
      {currentView === 'eventDetails' && renderEventDetails()}
    </View>
  </ScrollView>
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
    paddingTop: 30,
    alignItems: 'center',
  
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.black,
  },
  calendarContainer: {
    flex: 1,
  },
  calendarHeaderContainer: {
    alignItems: 'center',
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
    borderWidth: 1,
    borderColor: colors.black,
  },
  emptyStateButtonText: {
    color: 'black',
    fontWeight: 'bold',
  },
  formContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  formContentContainer: {
    padding: 15,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000',
    textAlign: 'center',
  },
  formLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: colors.darkGrey,
    textAlign: 'center',

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
    gap: 8, // Adds spacing between buttons for better layout
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.lightGrey,
    borderRadius: 10,
    width: '48%',
    justifyContent: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Adds subtle shadow on Android for depth
  },
  activeButton: {
    backgroundColor: colors.yellow,
    borderColor: colors.black,
  },
  typeButtonText: {
    fontSize: 16,
    marginLeft: 8,
    color: colors.darkGrey,
  },
  typeButtonTextActive: {
    color: colors.black,
    fontWeight: 'bold',
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
  categoryButtonActive: {
    backgroundColor: colors.yellow,
    borderColor: colors.black,
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
    padding: 7,
    borderWidth: 1,
    borderColor: colors.lightGrey,
    borderRadius: 8,
    width: '23%',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  repeatButtonActive: {
    backgroundColor: colors.yellow,
    borderColor: colors.yellow,
  },
  repeatButtonText: {
    fontSize: 13,
    color: colors.darkGrey,
  },
  repeatButtonTextActive: {
    color: colors.black,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: colors.yellow,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.black,
  },
  saveButtonText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: colors.black,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.yellow
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: 16,
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: colors.yellow,
    height: '100%',
    paddingBottom: 50,
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
    textAlign: 'center',  
  },
  detailsTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',  // Centers the content horizontally
    marginBottom: 5,
  },
  detailsType: {
    fontSize: 16,
    marginLeft: 5,
    textAlign: 'center',  // Center the text inside the container
  },
  
  detailsCategoryContainer: {
    marginTop: 5,
  },
  detailsCategory: {
    fontSize: 14,
    color: colors.darkGrey,
    textAlign: 'center',  
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
    backgroundColor: colors.black,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  deleteButtonText: {
    color: colors.white,
    marginLeft: 5,
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: colors.black,
    paddingVertical: 4,
    paddingHorizontal: 20,
    borderRadius: 40,
    width: '30%',
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    textAlign: 'center',
    paddingBottom: 2,
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
  activeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  vetTypeButtonActive: {
    backgroundColor: colors.yellow,
    borderColor: colors.yellow,
  },
  medicationCategoryActive: {
    backgroundColor: colors.yellow,
    borderColor: colors.yellow,
  },
  vetCategoryActive: {
    backgroundColor: colors.yellow,
    borderColor: colors.yellow,
  },
});
export default Calendar; 