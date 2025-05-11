import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Keys for storing subscription-related data
const APP_USAGE_KEY = 'app_usage_count';
const SUBSCRIPTION_STATUS_KEY = 'subscription_status';
const LAST_PROMPT_DATE_KEY = 'last_subscription_prompt_date';

/**
 * Initialize app usage tracking
 * This is called when the app starts to track usage
 */
export const initializeAppUsage = async () => {
  try {
    // Get current usage count
    const usageCount = await AsyncStorage.getItem(APP_USAGE_KEY);
    
    if (usageCount === null) {
      // First time usage
      await AsyncStorage.setItem(APP_USAGE_KEY, '1');
    } else {
      // Increment usage count
      const newCount = parseInt(usageCount) + 1;
      await AsyncStorage.setItem(APP_USAGE_KEY, newCount.toString());
    }
    
    console.log('App usage initialized/updated');
  } catch (error) {
    console.error('Error initializing app usage:', error);
  }
};

/**
 * Check subscription status and prompt user if needed
 * @param {object} navigation - Navigation object for redirecting to subscription page
 */
export const checkAndPromptForSubscription = async (navigation) => {
  try {
    // Get subscription status
    const subscriptionStatus = await AsyncStorage.getItem(SUBSCRIPTION_STATUS_KEY);
    
    // If user already has an active subscription, no need to prompt
    if (subscriptionStatus === 'active') {
      console.log('User has active subscription');
      return;
    }
    
    // Check usage count to determine if we should show subscription prompt
    const usageCount = await AsyncStorage.getItem(APP_USAGE_KEY);
    const count = parseInt(usageCount || '0');
    
    // Check when we last prompted the user
    const lastPromptDate = await AsyncStorage.getItem(LAST_PROMPT_DATE_KEY);
    const currentDate = new Date().toDateString();
    
    // Only prompt if:
    // 1. Usage count is a multiple of 5 (every 5 uses)
    // 2. We haven't prompted today already
    if (count % 5 === 0 && lastPromptDate !== currentDate) {
      // Update last prompt date
      await AsyncStorage.setItem(LAST_PROMPT_DATE_KEY, currentDate);
      
      // Show subscription prompt
      Alert.alert(
        "Upgrade to Premium",
        "Enjoy unlimited access to all features including lost dog tracking, danger zones, and territory management.",
        [
          {
            text: "Not Now",
            style: "cancel"
          },
          {
            text: "View Plans",
            onPress: () => navigation.navigate('Subscription')
          }
        ]
      );
    }
  } catch (error) {
    console.error('Error checking subscription status:', error);
  }
};

/**
 * Set subscription status after successful payment
 * @param {string} status - Subscription status ('active', 'expired', 'canceled')
 * @param {string} plan - Subscription plan ('monthly', 'yearly', 'lifetime')
 * @param {Date} expiryDate - Expiration date of the subscription
 */
export const setSubscriptionStatus = async (status, plan, expiryDate) => {
  try {
    const subscriptionData = {
      status,
      plan,
      expiryDate: expiryDate.toISOString(),
      purchaseDate: new Date().toISOString()
    };
    
    await AsyncStorage.setItem(SUBSCRIPTION_STATUS_KEY, 'active');
    await AsyncStorage.setItem('subscription_details', JSON.stringify(subscriptionData));
    
    console.log('Subscription activated:', subscriptionData);
    return true;
  } catch (error) {
    console.error('Error setting subscription status:', error);
    return false;
  }
};

/**
 * Check if user has access to premium features
 * @returns {Promise<boolean>} True if user has premium access
 */
export const hasPremiumAccess = async () => {
  try {
    const status = await AsyncStorage.getItem(SUBSCRIPTION_STATUS_KEY);
    
    if (status === 'active') {
      // Check if subscription has expired
      const detailsStr = await AsyncStorage.getItem('subscription_details');
      
      if (detailsStr) {
        const details = JSON.parse(detailsStr);
        
        // If it's a lifetime plan, it never expires
        if (details.plan === 'lifetime') {
          return true;
        }
        
        // Check expiry date for other plans
        const expiryDate = new Date(details.expiryDate);
        const now = new Date();
        
        if (expiryDate > now) {
          return true;
        } else {
          // Subscription expired
          await AsyncStorage.setItem(SUBSCRIPTION_STATUS_KEY, 'expired');
          return false;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking premium access:', error);
    return false;
  }
};

/**
 * Process payment and activate subscription
 * This is a simplified version - in a real app, you would integrate with Stripe, PayPal, etc.
 * @param {string} plan - Subscription plan ('monthly', 'yearly', 'lifetime')
 * @returns {Promise<boolean>} True if payment was successful
 */
export const processPayment = async (plan) => {
  try {
    // Simulate payment processing
    // In a real app, this would call a payment API
    
    // Calculate expiry date based on plan
    let expiryDate = new Date();
    
    switch (plan) {
      case 'monthly':
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        break;
      case 'yearly':
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        break;
      case 'lifetime':
        // Set a very far future date for lifetime
        expiryDate.setFullYear(expiryDate.getFullYear() + 100);
        break;
      default:
        throw new Error('Invalid subscription plan');
    }
    
    // Activate subscription
    const success = await setSubscriptionStatus('active', plan, expiryDate);
    
    return success;
  } catch (error) {
    console.error('Error processing payment:', error);
    return false;
  }
};

/**
 * Cancel subscription
 * @returns {Promise<boolean>} True if cancellation was successful
 */
export const cancelSubscription = async () => {
  try {
    // In a real app, this would call your backend API to cancel subscription
    
    await AsyncStorage.setItem(SUBSCRIPTION_STATUS_KEY, 'canceled');
    
    return true;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return false;
  }
};

/**
 * Get subscription details
 * @returns {Promise<Object|null>} Subscription details or null if not subscribed
 */
export const getSubscriptionDetails = async () => {
  try {
    const status = await AsyncStorage.getItem(SUBSCRIPTION_STATUS_KEY);
    
    if (status !== 'active') {
      return null;
    }
    
    const detailsStr = await AsyncStorage.getItem('subscription_details');
    if (!detailsStr) {
      return null;
    }
    
    return JSON.parse(detailsStr);
  } catch (error) {
    console.error('Error getting subscription details:', error);
    return null;
  }
};

// Export all functions as default
const subscriptionUtils = {
  initializeAppUsage,
  checkAndPromptForSubscription,
  setSubscriptionStatus,
  hasPremiumAccess,
  processPayment,
  cancelSubscription,
  getSubscriptionDetails
};

export default subscriptionUtils; 