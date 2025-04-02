// API and environment configuration
const environments = {
  // Try these API URLs in order
  API_BASE_URL: 'https://0361-2a09-bac5-488b-5cd-00-94-19.ngrok-free.app', // Your actual IP
  

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