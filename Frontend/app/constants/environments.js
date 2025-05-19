// API and environment configuration
const environments = {
  // Try these API URLs in order
  API_BASE_URL: 'http://134.209.237.216', // Your VM server IP

  STRIPE_PUBLISHABLE_KEY:'pk_test_51RMZg74gOVNJuN98BWgCFr9er7v7RMDnAG0M8D2m6gJEJZTioZ72ACDUrYmmMAHAdUQNdFlXphNkNACq8G9mITSC00voNPZjTN',
  // Fallback URLs
  STRIPE_PRICE_ID: 'price_1ROlFj4gOVNJuN98Tve6xFMZ',
  API_FALLBACK_URLS: [
    'http://134.209.237.216',
    'http://134.209.237.216',
    'http://134.209.237.216' // For Android emulator
  ],
  
  // Max retry attempts for API calls
  MAX_RETRIES: 3,
  
  // Timeout for API calls in milliseconds
  TIMEOUT: 5000,
  
  // Feature flags
  FEATURES: {
    ENABLE_SAFE_ZONES: true,
    ENABLE_NOTIFICATIONS: true,
    ENABLE_OFFLINE_MODE: true
  }
};

export default environments; 