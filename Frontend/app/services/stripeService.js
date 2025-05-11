import api from './api'; // Import the API client

export const stripeService = {
  /**
   * Get current subscription details
   * @returns {Promise} - Subscription data
   */
  getSubscription: () => api.get('/api/subscription'),
  
  /**
   * Create a new subscription
   * @param {Object} data - Subscription data including planId and payment method
   * @returns {Promise} - Created subscription
   */
  createSubscription: (data) => api.post('/api/create-subscription', data),
  
  /**
   * Create a subscription from a successful payment
   * @param {Object} data - Data including paymentIntentId
   * @returns {Promise} - Created subscription
   */
  createSubscriptionFromPayment: (data) => 
    api.post('/api/create-subscription-from-payment', data),
  
  /**
   * Cancel a subscription
   * @param {string} subscriptionId - ID of subscription to cancel
   * @param {boolean} immediately - Whether to cancel immediately or at period end
   * @returns {Promise} - Cancelled subscription
   */
  cancelSubscription: (subscriptionId, immediately = false) => 
    api.post(`/api/cancel-subscription/${subscriptionId}`, { cancelImmediately: immediately }),
  
  /**
   * Create a billing portal session for subscription management
   * @param {string} returnUrl - URL to return to after managing subscription
   * @returns {Promise} - Session data with URL
   */
  createBillingPortalSession: (returnUrl) => 
    api.post('/api/create-billing-portal-session', { returnUrl }),
  
  /**
   * Create a payment sheet for one-time payments
   * @param {Object} data - Payment data including amount and currency
   * @returns {Promise} - Payment sheet params
   */
  createPaymentSheet: (data) => api.post('/api/create-payment-sheet', data),
  
  /**
   * Create a payment sheet specifically for subscriptions
   * @param {Object} data - Payment data including planId, amount and currency
   * @returns {Promise} - Payment sheet params with setupIntent if needed
   */
  createSubscriptionPayment: (data) => api.post('/api/create-subscription-payment', data),
  
  /**
   * Confirm a subscription using payment method
   * @param {Object} data - Data including subscriptionId and paymentMethodId
   * @returns {Promise} - Confirmed subscription
   */
  confirmSubscription: (data) => api.post('/api/confirm-subscription', data),
  
  /**
   * Activate a subscription with payment
   * @param {Object} data - Data with subscriptionId, paymentMethodId and paymentIntentId
   * @returns {Promise} - Activated subscription
   */
  activateSubscriptionWithPayment: (data) => api.post('/api/activate-subscription-with-payment', data)
};

// Add default export
export default stripeService; 