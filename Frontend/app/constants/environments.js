// API and environment configuration
const environments = {
  // Try these API URLs in order
  API_BASE_URL: 'https://angel-soonest-lead-combination.trycloudflare.com', // Your actual IP
  
  // Fallback URLs
  API_FALLBACK_URLS: [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://10.0.2.2:3001' // For Android emulator
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