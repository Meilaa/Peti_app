// constants/enviroments.js
const enviroments = {
  // Main API URLs with fallbacks
  API_URLS: [
    'http://134.209.237.216',
  ],
  
  // For backward compatibility
  API_BASE_URL: 'http://134.209.237.216',
  API_FALLBACK_URL: 'http://134.209.237.216',
  
  // Stripe settings
  STRIPE_PUBLISHABLE_KEY: 'pk_test_51RMZg74gOVNJuN98BWgCFr9er7v7RMDnAG0M8D2m6gJEJZTioZ72ACDUrYmmMAHAdUQNdFlXphNkNACq8G9mITSC00voNPZjTN',
  
  // Colors
  colors: {
    primary: '#FFB100',  // Yellow
    secondary: '#333333', // Dark gray
    accent: '#42A5F5',   // Blue
    error: '#FF5252',    // Red
    success: '#4CAF50',  // Green
    background: '#FAFAFA', // Light gray background
    surface: '#FFFFFF',  // White
    text: '#333333',     // Dark text
    textLight: '#757575', // Light text
    warning: '#FFC107',
    info: '#2196F3',
  }
};

export default enviroments; // Default export