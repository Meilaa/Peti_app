// dogService.js
const dogService = {
    getDogInfo: (dogId) => {
      // Mock dog data
      return { id: dogId, name: 'Rex', breed: 'Labrador' };
    },
  
    addDog: (dogData) => {
      return `Dog ${dogData.name} added!`;  // Simulate adding a dog
    }
  };
  
  export default dogService; // Default export
  