// locationService.js
const locationService = {
    getLocation: () => {
      return { lat: 37.7749, lon: -122.4194 };  // Example coordinates (San Francisco)
    },
  
    updateLocation: (lat, lon) => {
      return `Location updated to Latitude: ${lat}, Longitude: ${lon}`;
    }
  };
  
  export default locationService; // Default export
  