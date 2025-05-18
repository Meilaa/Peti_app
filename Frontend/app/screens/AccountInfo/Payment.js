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
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import colors from '../../constants/colors';
import environments from '../../constants/enviroments';
import moment from 'moment';

const { width, height } = Dimensions.get('window');

const normalize = (size) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

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
    currency: 'eur',
    currencySymbol: '€'
  }
];

export default function Payment() {
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [trialDaysUsed, setTrialDaysUsed] = useState(0);
  const [subscription, setSubscription] = useState(null);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [formattedRenewalDate, setFormattedRenewalDate] = useState('Not available');
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const router = useRouter();

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
  };

  useEffect(() => {
    const initialize = async () => {
      await calculateTrialDaysUsed();
      await fetchSubscription();
      setLoading(false);
    };
    
    initialize();
  }, []);

  const calculateTrialDaysUsed = async () => {
    try {
      const firstOpenTimestamp = await AsyncStorage.getItem('firstOpenTimestamp');
      if (firstOpenTimestamp) {
        const diffDays = moment().diff(moment(parseInt(firstOpenTimestamp)), 'days');
        setTrialDaysUsed(diffDays);
      } else {
        const timestamp = Date.now();
        await AsyncStorage.setItem('firstOpenTimestamp', timestamp.toString());
        setTrialDaysUsed(0);
      }
    } catch (error) {
      console.error('Error calculating trial days:', error);
    }
  };

  const getAuthToken = async () => {
    return await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('userToken');
  };

  const fetchSubscription = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;
  
      const response = await fetch(`${environments.API_BASE_URL}/api/stripe/subscription`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
  
      if (response.status === 404) {
        setSubscription(null);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get subscription status');
      }
  
      const subscriptionData = await response.json();
      console.log('Received subscription data:', subscriptionData);
      
      if (!subscriptionData || !subscriptionData.subscriptionId) {
        setSubscription(null);
        return;
      }
  
      setSubscription(subscriptionData);
      updateFormattedRenewalDate(subscriptionData);
      await AsyncStorage.setItem('subscription', JSON.stringify(subscriptionData));
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
    }
  };

  const initializePayment = async () => {
    if (!selectedPlan) {
      Alert.alert('Error', 'Please select a plan first');
      return;
    }
    
    setProcessingPayment(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // First create or get customer
      const customerResponse = await fetch(`${environments.API_BASE_URL}/api/stripe/create-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!customerResponse.ok) {
        const errorData = await customerResponse.json();
        throw new Error(errorData.error || 'Customer setup failed');
      }

      const customerData = await customerResponse.json();
      console.log('Customer data:', customerData);
      
      if (!customerData.customerId) {
        throw new Error('No customer ID received from server');
      }

      // Create payment sheet
      const paymentSheetResponse = await fetch(`${environments.API_BASE_URL}/api/stripe/create-payment-sheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Math.round(selectedPlan.price * 100),
          currency: selectedPlan.currency
        })
      });

      if (!paymentSheetResponse.ok) {
        const errorData = await paymentSheetResponse.json();
        throw new Error(errorData.error || 'Payment setup failed');
      }

      const paymentSheetData = await paymentSheetResponse.json();
      console.log('Payment sheet data:', paymentSheetData);
      
      const { paymentIntent, ephemeralKey, customer } = paymentSheetData;

      if (!paymentIntent || !ephemeralKey || !customer) {
        throw new Error('Missing required payment sheet data');
      }

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: paymentIntent,
        customerEphemeralKeySecret: ephemeralKey,
        customerId: customer,
        merchantDisplayName: 'Peti Pet Tracking',
        style: 'automatic',
        googlePay: {
          merchantCountryCode: 'US',
          testEnv: __DEV__,
        },
        applePay: {
          merchantCountryCode: 'US',
        },
      });

      if (initError) {
        throw new Error(initError.message);
      }

      const { error: presentError } = await presentPaymentSheet();
      
      if (presentError) {
        if (presentError.code === 'Canceled') {
          setProcessingPayment(false);
          return;
        }
        throw new Error(presentError.message);
      }
      
      // Payment successful, now create subscription
      const subscriptionResponse = await fetch(`${environments.API_BASE_URL}/api/stripe/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: customer
        })
      });

      console.log('Subscription response status:', subscriptionResponse.status);
      const responseText = await subscriptionResponse.text();
      console.log('Raw subscription response:', responseText);

      if (!subscriptionResponse.ok) {
        let errorMessage = 'Subscription creation failed';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }

      let subscriptionData;
      try {
        subscriptionData = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing subscription response:', e);
        throw new Error('Invalid subscription data received');
      }
      
      console.log('Parsed subscription data:', subscriptionData);
      
      // Validate subscription data
      if (!subscriptionData || !subscriptionData.subscriptionId) {
        throw new Error('Invalid subscription data received');
      }

      // Update local state and storage
      setSubscription(subscriptionData);
      updateFormattedRenewalDate(subscriptionData);
      await AsyncStorage.setItem('subscription', JSON.stringify(subscriptionData));
      
      Alert.alert(
        'Success', 
        'Your premium subscription is now active! Enjoy all the premium features.'
      );
      
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', error.message || 'An error occurred during payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const updateFormattedRenewalDate = (sub) => {
    if (!sub) return;
    
    let dateToFormat;
    if (sub.status === 'trialing' && sub.trialEnd) {
      dateToFormat = sub.trialEnd;
    } else {
      dateToFormat = sub.currentPeriodEnd;
    }
  
    if (dateToFormat) {
      try {
        const formattedDate = moment(dateToFormat).format('MMMM D, YYYY');
        setFormattedRenewalDate(formattedDate);
      } catch (error) {
        console.error('Error formatting date:', error);
        setFormattedRenewalDate('Not available');
      }
    } else {
      setFormattedRenewalDate('Not available');
    }
  };

  const cancelTrial = async (subscriptionId) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${environments.API_BASE_URL}/api/stripe/cancel-subscription/${subscriptionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ immediate: true })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel subscription');
      }

      const result = await response.json();
      console.log('Cancellation result:', result);
      return result;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  };

  const cancelSubscription = async () => {
    try {
      if (!subscription?.subscriptionId) {
        throw new Error('No active subscription found');
      }
  
      const isTrial = subscription.status === 'trialing';
      const endDate = subscription.currentPeriodEnd 
        ? moment(subscription.currentPeriodEnd).format('MMMM D, YYYY')
        : 'the end of the billing period';
  
      Alert.alert(
        isTrial ? 'Cancel Trial?' : 'Cancel Subscription?',
        isTrial 
          ? 'Are you sure you want to cancel your trial? You will lose access to premium features immediately.'
          : `Your subscription will be cancelled on ${endDate}. You'll still have access until then.`,
        [
          { 
            text: 'No, Keep It', 
            style: 'cancel'
          },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              try {
                setCancelingSubscription(true);
                const token = await getAuthToken();
                
                // Make sure to use the correct endpoint
                const response = await fetch(
                  `${environments.API_BASE_URL}/api/stripe/cancel-subscription`, 
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Accept': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                      immediate: isTrial // Cancel immediately if it's a trial
                    })
                  }
                );
  
                // First get the response text for debugging
                const responseText = await response.text();
                console.log('Raw response:', responseText);
  
                // Try to parse it as JSON
                let responseData;
                try {
                  responseData = JSON.parse(responseText);
                } catch (parseError) {
                  console.error('Failed to parse response:', parseError);
                  throw new Error('Invalid response from server');
                }
  
                if (!response.ok) {
                  throw new Error(responseData.error || 'Failed to cancel subscription');
                }
  
                // Clear subscription data from AsyncStorage
                await AsyncStorage.removeItem('subscription');
                
                // Update local state
                setSubscription(null);
                
                Alert.alert(
                  isTrial ? 'Trial Cancelled' : 'Subscription Cancelled', 
                  isTrial 
                    ? 'Your trial has been cancelled. You no longer have access to premium features.'
                    : `Your subscription access will end on ${endDate}.`
                );
              } catch (error) {
                console.error('Cancel subscription error:', error);
                Alert.alert('Error', error.message || 'Failed to cancel subscription');
              } finally {
                setCancelingSubscription(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Cancel subscription error:', error);
      Alert.alert('Error', error.message || 'An error occurred');
    }
  };

  const resumeSubscription = async () => {
    try {
      if (!subscription?.subscriptionId || !subscription.cancelAtPeriodEnd) {
        return;
      }

      setCancelingSubscription(true);
      const token = await getAuthToken();
      
      const response = await fetch(
        `${environments.API_BASE_URL}/api/stripe/resume-subscription`, 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ subscriptionId: subscription.subscriptionId })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resume subscription');
      }

      await fetchSubscription(); // Refresh subscription data
      Alert.alert('Success', 'Your subscription has been resumed.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to resume subscription');
    } finally {
      setCancelingSubscription(false);
    }
  };

  const renderSubscriptionInfo = () => {
    if (!subscription) return null;

    console.log('Rendering subscription info:', subscription);

    const isCancelling = subscription.cancelAtPeriodEnd;
    const isTrial = subscription.status === 'trialing';
    const renewalDate = formattedRenewalDate === 'Not available' 
      ? 'the end of the billing period' 
      : formattedRenewalDate;

    return (
      <View style={styles.subscriptionInfoContainer}>
        <View style={styles.subscriptionHeader}>
          <FontAwesome5 name="crown" size={24} color={colors.yellow} />
          <Text style={styles.subscriptionTitle}>Your Premium Subscription</Text>
        </View>
        
        <View style={[styles.statusBadge, isCancelling ? styles.cancellingBadge : styles.activeBadge]}>
          <Text style={styles.statusBadgeText}>
            {isCancelling ? 'Cancelling' : isTrial ? 'Trial' : 'Active'}
          </Text>
        </View>
        
        <View style={styles.subscriptionDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Plan:</Text>
            <Text style={styles.detailValue}>Basic Plan (€4.99/month)</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {isTrial ? 'Trial Ends:' : isCancelling ? 'Access Until:' : 'Next Renewal:'}
            </Text>
            <Text style={styles.detailValue}>{renewalDate}</Text>
          </View>
        </View>

        {isCancelling ? (
          <TouchableOpacity 
            style={styles.resumeButton}
            onPress={resumeSubscription}
            disabled={cancelingSubscription}
          >
            {cancelingSubscription ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.resumeButtonText}>Resume Subscription</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={cancelSubscription}
            disabled={cancelingSubscription}
          >
            {cancelingSubscription ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.cancelButtonText}>
                {isTrial ? 'Cancel Trial' : 'Cancel Subscription'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
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
          </View>
        ) : subscription && subscription.active ? (
          renderSubscriptionInfo()
        ) : (
          <>

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
                    <Text style={styles.planPrice}>
                      {plan.currencySymbol}{plan.price.toFixed(2)} {plan.currency.toUpperCase()}/month
                    </Text>
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

                <View style={styles.trialBadge}>
                  <Text style={styles.trialBadgeText}>Includes 14-day free trial</Text>
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
                      <Text style={styles.payButtonText}>Subscribe Now</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <Text style={styles.disclaimerText}>
                  By subscribing, you agree to our Terms of Service and Privacy Policy. 
                  You can cancel anytime.
                </Text>
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
    marginBottom: height * 0.005,
    marginTop: height * 0.02,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: width * 0.05,
    paddingBottom: height * 0.03,
  },
  sectionTitle: {
    fontSize: normalize(22),
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: height * 0.01,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: normalize(14),
    color: colors.grey,
    marginBottom: height * 0.03,
    textAlign: 'center',
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
    marginBottom: height * 0.02,
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
  trialBadge: {
    backgroundColor: '#e6f7ed', 
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  trialBadgeText: {
    fontSize: normalize(12),
    color: '#2a6e51',
    fontWeight: '500',
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
  disclaimerText: {
    fontSize: normalize(12),
    color: colors.lightGrey,
    textAlign: 'center',
    marginTop: 12,
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
  cancelButton: {
    backgroundColor: colors.black,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    width: '100%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: normalize(15),
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  resumeButton: {
    backgroundColor: colors.yellow,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    width: '100%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resumeButtonText: {
    color: colors.black,
    fontSize: normalize(16),
    fontWeight: '700',
    textTransform: 'uppercase',
  }
});