import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import colors from '../../constants/colors';
import environments from '../../constants/enviroments';
import moment from 'moment'; // Add moment for date formatting

// Get screen dimensions for responsive design
const { width, height } = Dimensions.get('window');

// Responsive font size function (reused from other screens)
const normalize = (size) => {
  const scale = width / 375; // 375 is standard iPhone width
  const newSize = size * scale;
  return Math.round(newSize);
};

// Payment options
const paymentOptions = [
  {
    id: 'basic',
    name: 'Basic Plan',
    price: 4.99,
    description: 'Essential pet tracking features',
    features: [
      'Basic pet tracking',
      'Standard health reports',
      'Email support'
    ],
    icon: 'paw',
    color: colors.yellow,
    currency: 'eur', // Changed to euros
    currencySymbol: '€' // Added euro symbol
  }
];

export default function Payment() {
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [trialDaysUsed, setTrialDaysUsed] = useState(0);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [formattedRenewalDate, setFormattedRenewalDate] = useState('Not available');
  const { initPaymentSheet, presentPaymentSheet, confirmPayment } = useStripe();
  const stripe = useStripe();
  const router = useRouter();

  // Calculate trial days used when component mounts
  useEffect(() => {
    const initialize = async () => {
      await calculateTrialDaysUsed();
      await ensureStripeInitialized();
      const userSubscription = await checkSubscriptionStatus();
      
      setLoading(false);
      if (userSubscription) {
        console.log('Current subscription:', userSubscription);
        setSubscription(userSubscription);
        
        // Format the renewal date
        updateFormattedRenewalDate(userSubscription);
        
        // User has an active subscription
        if (userSubscription.status === 'active') {
          console.log('User has active subscription');
        }
      } else {
        // No subscription found - this is normal for new users
        console.log('No active subscription - user needs to subscribe');
      }
    };
    
    initialize();
  }, []);

  // Function to ensure Stripe is initialized
  const ensureStripeInitialized = async () => {
    try {
      console.log('Making sure Stripe is initialized...');
      // Add any specific Stripe initialization logic if needed
      console.log('Stripe availability check completed');
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      Alert.alert('Stripe Error', 'Could not initialize payment system. Please try again later.');
      throw error; // Re-throw to handle in the calling function
    }
  };

  const calculateTrialDaysUsed = async () => {
    try {
      const firstOpenTimestamp = await AsyncStorage.getItem('firstOpenTimestamp');
      
      if (firstOpenTimestamp) {
        const startDate = new Date(parseInt(firstOpenTimestamp));
        const currentDate = new Date();
        
        // Calculate days difference
        const diffTime = Math.abs(currentDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setTrialDaysUsed(diffDays);
      }
    } catch (error) {
      console.error('Error calculating trial days:', error);
    }
  };

  const getAuthToken = async () => {
    return await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('userToken');
  };

  // Helper function to safely parse JSON responses
  const safelyParseJson = async (response) => {
    const text = await response.text();
    try {
      // Try to parse as JSON
      return JSON.parse(text);
    } catch (error) {
      // If it's not valid JSON, log and throw an error with more information
      console.error('Error parsing JSON response:', error);
      console.error('Response status:', response.status);
      console.error('Response text:', text.substring(0, 500) + (text.length > 500 ? '...' : ''));
      
      if (text.includes('<html') || text.includes('<!DOCTYPE')) {
        throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
      } else {
        throw new Error(`Invalid JSON response. Status: ${response.status}`);
      }
    }
  };

// In your React Native application:

const initializePayment = async () => {
  if (!selectedPlan) {
    Alert.alert('Error', 'Please select a plan first');
    return;
  }
  setProcessingPayment(true);
  try {
    const token = await getAuthToken();
    if (!token) throw new Error('Authentication required');
    
    console.log('Starting payment process for', selectedPlan.name);
    
    // Step 1: Create customer if needed
    const customerResponse = await fetch(`${environments.API_BASE_URL}/api/create-customer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    
    if (!customerResponse.ok) {
      throw new Error(`Failed to create customer: ${customerResponse.status}`);
    }
    
    const customerData = await safelyParseJson(customerResponse);
    console.log('Customer ID:', customerData.customerId);
    
    // Step 2: Get payment sheet parameters
    const paymentSheetResponse = await fetch(`${environments.API_BASE_URL}/api/create-payment-sheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        amount: Math.round(selectedPlan.price * 100),
        currency: selectedPlan.currency
      })
    });
    
    if (!paymentSheetResponse.ok) {
      throw new Error(`Failed to create payment sheet: ${paymentSheetResponse.status}`);
    }
    
    const { paymentIntent, ephemeralKey, customer } = await safelyParseJson(paymentSheetResponse);
    
    // Step 3: Initialize payment sheet
    const { error: initError } = await initPaymentSheet({
      paymentIntentClientSecret: paymentIntent,
      customerEphemeralKeySecret: ephemeralKey,
      customerId: customer,
      merchantDisplayName: 'Peti Pet Tracking'
    });
    
    if (initError) {
      throw new Error(`Payment sheet initialization error: ${initError.message}`);
    }
    
    // Step 4: Present payment sheet
    const { error: presentError } = await presentPaymentSheet();
    
    if (presentError) {
      if (presentError.code === 'Canceled') {
        Alert.alert('Payment Cancelled', 'You cancelled the payment process.');
        return;
      }
      throw new Error(`Payment sheet error: ${presentError.message}`);
    }
    
    console.log('Payment successful! Creating subscription from payment...');
    
    // Extract the payment intent ID from client secret
    // The pattern is typically: pi_123456789_secret_987654321
    const paymentIntentId = paymentIntent.split('_secret_')[0];
    console.log('Payment Intent ID:', paymentIntentId);
    
    // Step 5: Create subscription from successful payment
    const subscriptionResponse = await fetch(`${environments.API_BASE_URL}/api/create-subscription-from-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        paymentIntentId: paymentIntentId
      })
    });
    
    if (!subscriptionResponse.ok) {
      throw new Error(`Failed to create subscription: ${subscriptionResponse.status}`);
    }
    
    const subscriptionData = await safelyParseJson(subscriptionResponse);
    console.log('Subscription created successfully:', subscriptionData);
    
    // Step 6: Verify subscription status
    if (subscriptionData.status === 'active') {
      Alert.alert('Subscription Active', 'Your subscription is now active!');
      setSubscription(subscriptionData);
      
      // Store subscription in AsyncStorage
      await AsyncStorage.setItem('subscription', JSON.stringify({
        id: subscriptionData.subscriptionId,
        status: subscriptionData.status,
        currentPeriodEnd: subscriptionData.currentPeriodEnd
      }));
      
      // Refresh subscription status
      refreshSubscriptionStatus();
    } else {
      throw new Error(`Subscription not active. Status: ${subscriptionData.status}`);
    }
  } catch (error) {
    console.error('Payment process error:', error);
    Alert.alert('Error', error.message);
  } finally {
    setProcessingPayment(false);
  }
};
  const handlePaymentCompletion = async ({ error, subscription }) => {
    if (error) {
      Alert.alert('Payment Failed', error.message);
      return;
    }
  
    try {
      // Store subscription details in AsyncStorage
      await AsyncStorage.setItem('subscription', JSON.stringify({
        plan: selectedPlan.id,
        price: selectedPlan.price,
        currency: selectedPlan.currency,
        status: 'active',
        currentPeriodEnd: subscription?.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      }));
  
      // Remove alert and directly refresh subscription info
      refreshSubscriptionStatus();
    } catch (error) {
      console.error('Error saving subscription:', error);
      Alert.alert('Error', 'Your payment was successful, but there was an error saving your subscription. Please contact support.');
    }
  };
  
  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    // Don't navigate away, just select the plan
  };

  const checkSubscriptionStatus = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.log('No auth token found');
        return null;
      }

      console.log('Checking subscription status...');
      const response = await fetch(`${environments.API_BASE_URL}/api/subscription`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 404) {
        // No subscription found - this is a normal case for new users
        console.log('No active subscription found - user needs to subscribe');
        return null;
      }

      if (!response.ok) {
        const errorData = await safelyParseJson(response);
        console.error('Subscription status error:', errorData);
        throw new Error(errorData.error || 'Failed to get subscription status');
      }

      const data = await safelyParseJson(response);
      console.log('Subscription status response:', data);
      return data;
    } catch (error) {
      // Only log as error if it's not the "no subscription" case
      if (error.message !== 'No subscription found') {
        console.error('Error checking subscription:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      return null;
    }
  };

  // Add a function to check if user has an active subscription
  const hasActiveSubscription = async () => {
    const subscription = await checkSubscriptionStatus();
    return subscription && subscription.status === 'active';
  };

  const refreshSubscriptionStatus = async () => {
    setLoading(true);
    const subscription = await checkSubscriptionStatus();
    setSubscription(subscription);
    setLoading(false);
  };

  const cancelSubscription = async (immediate = false) => {
    try {
      if (!subscription || !subscription.subscriptionId) {
        throw new Error('No active subscription found');
      }

      setCancelingSubscription(true);
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No auth token found');
      }

      // Show confirmation dialog
      Alert.alert(
        immediate ? 'Cancel Subscription Immediately?' : 'Cancel Subscription?',
        immediate 
          ? 'Your subscription will be cancelled immediately and you will lose access to premium features.'
          : 'Your subscription will be cancelled at the end of the current billing period. You will continue to have access until then.',
        [
          {
            text: 'No, Keep It',
            style: 'cancel',
            onPress: () => setCancelingSubscription(false)
          },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              console.log('Canceling subscription...');
              const response = await fetch(
                `${environments.API_BASE_URL}/api/cancel-subscription/${subscription.subscriptionId}`, 
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ cancelImmediately: immediate })
                }
              );

              if (!response.ok) {
                const errorData = await safelyParseJson(response);
                throw new Error(errorData.error || 'Failed to cancel subscription');
              }

              const data = await safelyParseJson(response);
              console.log('Cancel subscription response:', data);
              
              // Update subscription state
              if (immediate) {
                setSubscription(null);
                await AsyncStorage.removeItem('subscription');
                Alert.alert('Subscription Cancelled', 'Your subscription has been cancelled. You no longer have access to premium features.');
              } else {
                const updatedSubscription = { 
                  ...subscription,
                  cancelAtPeriodEnd: true,
                  status: data.status
                };
                setSubscription(updatedSubscription);
                await AsyncStorage.setItem('subscription', JSON.stringify(updatedSubscription));
                Alert.alert(
                  'Subscription Will Cancel',
                  `Your subscription will cancel on ${moment(data.currentPeriodEnd).format('MMMM D, YYYY')}. You will have access until then.`
                );
              }
              
              setCancelingSubscription(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error canceling subscription:', error);
      Alert.alert('Error', `Failed to cancel subscription: ${error.message}`);
      setCancelingSubscription(false);
    }
  };

  // Helper to update the formatted renewal date
  const updateFormattedRenewalDate = async (sub) => {
    let renewalDate = sub?.currentPeriodEnd;
    if (!renewalDate) {
      // Try to get from AsyncStorage as fallback
      try {
        const storedSubscriptionStr = await AsyncStorage.getItem('subscription');
        if (storedSubscriptionStr) {
          const storedSubscription = JSON.parse(storedSubscriptionStr);
          renewalDate = storedSubscription.currentPeriodEnd;
        }
      } catch (error) {
        console.error('Error getting subscription from AsyncStorage:', error);
      }
    }
    
    // Format date with fallback
    const formatted = renewalDate ? 
      moment(renewalDate).format('MMMM D, YYYY') : 
      'Not available';
      
    setFormattedRenewalDate(formatted);
  };

  // Render subscription info when user has an active subscription
  const renderSubscriptionInfo = () => {
    if (!subscription) return null;

    const isActive = subscription.status === 'active';
    const isIncomplete = subscription.status === 'incomplete';
    const isExpired = subscription.status === 'incomplete_expired';
    const willCancel = subscription.cancelAtPeriodEnd;
    
    // If subscription is expired, show restart option
    if (isExpired) {
      return (
        <View style={styles.subscriptionInfoContainer}>
          <View style={styles.subscriptionHeader}>
            <FontAwesome5 name="exclamation-triangle" size={24} color="#f44336" />
            <Text style={styles.subscriptionTitle}>Subscription Expired</Text>
          </View>
          
          <Text style={styles.expiredText}>
            Your subscription payment was not completed and has expired.
            Please start a new subscription to access premium features.
          </Text>
          
          <TouchableOpacity 
            style={styles.startNewButton}
            onPress={() => {
              cleanupExpiredSubscriptions().then(() => {
                setSelectedPlan(paymentOptions[0]);
              });
            }}
          >
            <Text style={styles.startNewButtonText}>Start New Subscription</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // Regular subscription display for active or other states
    return (
      <View style={styles.subscriptionInfoContainer}>
        <View style={styles.subscriptionHeader}>
          <FontAwesome5 name="crown" size={24} color={colors.yellow} />
          <Text style={styles.subscriptionTitle}>Your Premium Subscription</Text>
        </View>
        
        <View style={[
          styles.statusBadge, 
          isIncomplete ? styles.incompleteBadge : (willCancel ? styles.cancellingBadge : styles.activeBadge)
        ]}>
          <Text style={styles.statusBadgeText}>
            {isIncomplete ? 'Payment Required' : (willCancel ? 'Cancels Soon' : (isActive ? 'Active' : subscription.status))}
          </Text>
        </View>
        
        <View style={styles.subscriptionDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Plan:</Text>
            <Text style={styles.detailValue}>Basic Plan (€4.99/month)</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{willCancel ? 'Access Until:' : 'Next Renewal:'}</Text>
            <Text style={styles.detailValue}>{formattedRenewalDate}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <Text style={[
              styles.detailValue, 
              { color: isIncomplete ? '#ff5722' : (willCancel ? '#ff9800' : (isActive ? '#4caf50' : '#f44336')) }
            ]}>
              {isIncomplete ? 'Payment Needed' : (willCancel ? 'Cancels at period end' : (isActive ? 'Active' : subscription.status))}
            </Text>
          </View>
        </View>
        
        {isIncomplete && (
          <View style={styles.managementButtons}>
            <TouchableOpacity 
              style={styles.completePaymentButton}
              onPress={() => completeSubscription()}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.completePaymentText}>Complete Payment</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelImmediateButton}
              onPress={() => cancelSubscription(true)}
              disabled={cancelingSubscription}
            >
              {cancelingSubscription ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.cancelImmediateButtonText}>Cancel Subscription</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        
        {!isIncomplete && !willCancel && (
          <View style={styles.managementButtons}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => cancelSubscription(false)}
              disabled={cancelingSubscription}
            >
              {cancelingSubscription ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel at Period End</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelImmediateButton}
              onPress={() => cancelSubscription(true)}
              disabled={cancelingSubscription}
            >
              {cancelingSubscription ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.cancelImmediateButtonText}>Cancel Immediately</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        
        {willCancel && (
          <View style={styles.renewContainer}>
            <Text style={styles.renewText}>
              Your subscription will end on {formattedRenewalDate}. 
              You will lose access to premium features after this date.
            </Text>
            
            <TouchableOpacity 
              style={styles.resubscribeButton}
              onPress={() => refreshSubscriptionStatus()}
            >
              <Text style={styles.resubscribeButtonText}>Refresh Status</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };
// Add this function to your component
const cleanupExpiredSubscriptions = async () => {
  try {
    const token = await getAuthToken();
    const subscription = await checkSubscriptionStatus();
    
    // If we have an expired or incomplete subscription, cancel it
    if (subscription && 
        (subscription.status === 'incomplete' || 
         subscription.status === 'incomplete_expired')) {
      
      console.log('Cleaning up expired subscription:', subscription.subscriptionId);
      
      await fetch(
        `${environments.API_BASE_URL}/api/cancel-subscription/${subscription.subscriptionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ cancelImmediately: true })
        }
      );
      
      // Clear local subscription data
      await AsyncStorage.removeItem('subscription');
      setSubscription(null);
      
      console.log('Expired subscription cleaned up');
    }
  } catch (error) {
    console.error('Error cleaning up subscription:', error);
  }
};

// Call this in useEffect when component mounts:
useEffect(() => {
  const initialize = async () => {
    await calculateTrialDaysUsed();
    await ensureStripeInitialized();
    await cleanupExpiredSubscriptions(); // Add this line
    const userSubscription = await checkSubscriptionStatus();
    
    setLoading(false);
    if (userSubscription) {
      console.log('Current subscription:', userSubscription);
      setSubscription(userSubscription);
    }
  };
  
  initialize();
}, []);
  // Add this function to complete an incomplete subscription
  const completeSubscription = async () => {
    try {
      setProcessingPayment(true);
      const token = await getAuthToken();
      
      if (!subscription || !subscription.subscriptionId) {
        throw new Error('No valid subscription information found');
      }

      // Create a new payment sheet for the subscription completion
      const paymentResponse = await fetch(`${environments.API_BASE_URL}/api/create-subscription-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          subscriptionId: subscription.subscriptionId,
          amount: 499, // Fixed amount of 4.99 EUR in cents
          currency: 'eur'
        })
      });

      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        console.error('Payment creation failed. Status:', paymentResponse.status);
        console.error('Response:', errorText.substring(0, 500));
        throw new Error(`Failed to create payment. Status: ${paymentResponse.status}`);
      }

      const paymentData = await safelyParseJson(paymentResponse);
      
      // Initialize the payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: paymentData.paymentIntent,
        customerEphemeralKeySecret: paymentData.ephemeralKey,
        customerId: paymentData.customer,
        merchantDisplayName: 'Peti Pet Tracking',
        style: 'automatic',
        appearance: {
          colors: { primary: colors.yellow },
          shapes: { borderRadius: 8 },
          primaryButton: { shapes: { borderRadius: 8 } },
        },
      });
      
      if (initError) {
        console.error('Payment sheet initialization error:', initError);
        throw new Error(initError.message);
      }
      
      // Present the payment sheet
      const { error: presentError, paymentOption } = await presentPaymentSheet();
      
      if (presentError) {
        if (presentError.code === 'Canceled') {
          console.log('Payment cancelled by user');
          throw new Error('Payment process was cancelled');
        } else {
          console.error('Payment sheet presentation error:', presentError);
          throw new Error(presentError.message);
        }
      }
      
      // Payment was successful, now activate the subscription
      const paymentMethodId = paymentOption?.paymentMethodId;
      const paymentIntentId = paymentData.paymentIntentId;
      
      console.log('Payment successful! Activating subscription...');
      
      const confirmResponse = await fetch(`${environments.API_BASE_URL}/api/activate-subscription-with-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          subscriptionId: subscription.subscriptionId,
          paymentMethodId: paymentMethodId,
          paymentIntentId: paymentIntentId
        })
      });
      
      if (!confirmResponse.ok) {
        const errorText = await confirmResponse.text();
        console.error('Subscription activation failed. Status:', confirmResponse.status);
        console.error('Response:', errorText.substring(0, 500));
        throw new Error(`Failed to activate subscription. Status: ${confirmResponse.status}`);
      }
      
      const confirmedData = await safelyParseJson(confirmResponse);
      setSubscription(confirmedData);
      
      if (confirmedData.status === 'active') {
        Alert.alert('Success', 'Your subscription is now active!');
      }
      
      // Refresh subscription data
      await refreshSubscriptionStatus();
      
    } catch (error) {
      console.error('Error completing subscription:', error);
      Alert.alert('Error', 'Failed to complete subscription: ' + error.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={normalize(24)} color={colors.white} />
        </TouchableOpacity>
      </View>
      <Text style={styles.header2}>Premium Subscription</Text>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.yellow} />
            <Text style={styles.loadingText}>Loading subscription details...</Text>
          </View>
        ) : subscription ? (
          // Show subscription info when user has one
          renderSubscriptionInfo()
        ) : (
          // Show subscription purchase UI when user doesn't have one
          <>
            <View style={styles.trialInfoContainer}>
              <FontAwesome5 name="info-circle" size={20} color={colors.yellow} />
              <Text style={styles.trialInfoText}>
                {trialDaysUsed >= 14
                  ? 'Your 14-day free trial has ended. Subscribe to continue enjoying premium features.'
                  : `You have ${14 - trialDaysUsed} days left in your free trial.`}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            <Text style={styles.sectionSubtitle}>Select the plan that best fits your needs</Text>

            {paymentOptions.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan?.id === plan.id && styles.selectedPlanCard
                ]}
                onPress={() => handleSelectPlan(plan)}
              >
                <View style={styles.planHeader}>
                  <View style={[styles.planIconContainer, { backgroundColor: plan.color }]}>
                    <FontAwesome5 name={plan.icon} size={20} color="white" />
                  </View>
                  <View style={styles.planTitleContainer}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planPrice}>{plan.currencySymbol}{plan.price.toFixed(2)} {plan.currency.toUpperCase()}/month</Text>
                  </View>
                </View>
                
                <Text style={styles.planDescription}>{plan.description}</Text>
                
                <View style={styles.planFeatures}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.yellow} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}

            {selectedPlan && (
              <View style={styles.paymentSection}>
                <Text style={styles.paymentTitle}>Complete Your Purchase</Text>
                <Text style={styles.paymentSubtitle}>
                  You selected the {selectedPlan.name} plan ({selectedPlan.currencySymbol}{selectedPlan.price.toFixed(2)} {selectedPlan.currency.toUpperCase()}/month)
                </Text>
                
                <TouchableOpacity
                  style={styles.payButton}
                  onPress={initializePayment}
                  disabled={processingPayment}
                >
                  {processingPayment ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <FontAwesome5 name="credit-card" size={16} color="white" style={styles.buttonIcon} />
                      <Text style={styles.payButtonText}>Pay Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: width * 0.05,
    paddingBottom: height * 0.05,
  },
  sectionTitle: {
    fontSize: normalize(22),
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: height * 0.01,
  },
  sectionSubtitle: {
    fontSize: normalize(14),
    color: colors.grey,
    marginBottom: height * 0.03,
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: width * 0.04,
    marginBottom: height * 0.02,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  selectedPlanCard: {
    borderColor: colors.yellow,
    borderWidth: 2,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.015,
  },
  planIconContainer: {
    width: width * 0.1,
    height: width * 0.1,
    borderRadius: width * 0.05,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: width * 0.03,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    fontSize: normalize(16),
    fontWeight: 'bold',
    color: colors.black,
  },
  planPrice: {
    fontSize: normalize(14),
    color: colors.grey,
    marginTop: 2,
  },
  planDescription: {
    fontSize: normalize(14),
    color: colors.black,
    marginBottom: height * 0.015,
  },
  planFeatures: {
    marginTop: height * 0.01,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.008,
  },
  featureText: {
    fontSize: normalize(14),
    color: colors.black,
    marginLeft: width * 0.02,
  },
  paymentSection: {
    marginTop: 20,
    backgroundColor: colors.darkGrey,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  paymentTitle: {
    fontSize: normalize(18),
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  paymentSubtitle: {
    fontSize: normalize(14),
    color: colors.lightGrey,
    marginBottom: 20,
    textAlign: 'center',
  },
  payButton: {
    backgroundColor: colors.black,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  payButtonText: {
    color: colors.white,
    fontSize: normalize(16),
    fontWeight: 'bold',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  trialInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E5',
    padding: width * 0.04,
    borderRadius: 8,
    marginBottom: height * 0.03,
    borderLeftWidth: 4,
    borderLeftColor: colors.yellow,
  },
  trialInfoText: {
    flex: 1,
    marginLeft: width * 0.03,
    fontSize: normalize(14),
    color: colors.black,
    lineHeight: normalize(20),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: height * 0.1,
  },
  loadingText: {
    marginTop: height * 0.02,
    fontSize: normalize(16),
    color: colors.black,
  },
  subscriptionInfoContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: width * 0.05,
    marginBottom: height * 0.02,
    borderWidth: 1,
    borderColor: colors.yellow,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.02,
  },
  subscriptionTitle: {
    fontSize: normalize(20),
    fontWeight: 'bold',
    color: colors.black,
    marginLeft: width * 0.03,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: width * 0.03,
    paddingVertical: height * 0.005,
    borderRadius: 4,
    marginBottom: height * 0.02,
  },
  activeBadge: {
    backgroundColor: '#e6f7ed',
  },
  cancellingBadge: {
    backgroundColor: '#fff0e0',
  },
  statusBadgeText: {
    fontSize: normalize(12),
    fontWeight: '600',
    color: '#333',
  },
  subscriptionDetails: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: width * 0.04,
    marginBottom: height * 0.02,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: height * 0.01,
  },
  detailLabel: {
    fontSize: normalize(14),
    color: colors.grey,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: normalize(14),
    color: colors.black,
    fontWeight: '600',
  },
  managementButtons: {
    marginTop: height * 0.02,
  },
  cancelButton: {
    backgroundColor: colors.darkGrey,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: normalize(16),
    fontWeight: '600',
  },
  cancelImmediateButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  cancelImmediateButtonText: {
    color: '#f44336',
    fontSize: normalize(16),
    fontWeight: '600',
  },
  renewContainer: {
    marginTop: height * 0.02,
    alignItems: 'center',
  },
  renewText: {
    fontSize: normalize(14),
    color: '#ff9800',
    textAlign: 'center',
    marginBottom: height * 0.02,
  },
  resubscribeButton: {
    backgroundColor: colors.yellow,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  resubscribeButtonText: {
    color: colors.black,
    fontSize: normalize(16),
    fontWeight: '600',
  },
  completePaymentButton: {
    backgroundColor: colors.yellow,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: height * 0.02,
    marginBottom: 10,
    width: '100%',
  },
  completePaymentText: {
    color: colors.black,
    fontSize: normalize(16),
    fontWeight: '600',
  },
  expiredText: {
    fontSize: normalize(14),
    color: '#f44336',
    textAlign: 'center',
    marginVertical: height * 0.02,
  },
  startNewButton: {
    backgroundColor: colors.yellow,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  startNewButtonText: {
    color: colors.black,
    fontSize: normalize(16),
    fontWeight: '600',
  },
});