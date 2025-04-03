// constants/enviroments.js
const enviroments = {
  // Main API URLs with fallbacks
  API_URLS: [
    'https://aa37-2a09-bac5-488e-5cd-00-94-2f.ngrok-free.app',
  ],
  
  // For backward compatibility
  API_BASE_URL: 'https://aa37-2a09-bac5-488e-5cd-00-94-2f.ngrok-free.app',
  API_FALLBACK_URL: 'http://localhost:3001',
  API_LOCAL_URL: 'http://127.0.0.1:3001',
  
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