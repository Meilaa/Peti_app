# Quick Fixes for Save Button and Status Popup Issues

## Fix 1: Start the Backend First

Make sure the backend is running correctly before starting the app:

```powershell
# Kill any process using port 3001
netstat -ano | findstr :3001
taskkill /PID <pid> /F

# Start backend in correct location
cd C:\Users\Arculus\Desktop\Bacheolor\Backend\MyBachelor_Backend-main\MyBachelor_Backend-main
node index.js
```

## Fix 2: Update Your API URL

If your backend is running but the app can't connect, open `app/constants/environments.js` and make sure your actual IP address is used:

```js
API_BASE_URL: 'http://YOUR_ACTUAL_IP:3001', // Replace with your IP
```

## Fix 3: Save Button Not Working

If the save button still doesn't work, manually add a territory to AsyncStorage:

1. Go to SafeZone screen
2. Draw a zone with at least 3 points
3. Fill in the name and select an animal
4. Tap Save

If that still doesn't work, try clearing AsyncStorage:

```js
await AsyncStorage.clear(); // Add this to the start of your app
```

## Fix 4: Status Popup Still Showing

If the status popup is still appearing on the Home screen:

1. Make sure your changes to Home.js took effect
2. Try reloading the app completely
3. If the Legend button doesn't look right, update the style:

```js
legendButton: {
  position: 'absolute',
  top: 10, 
  right: 10,
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  padding: 10,
  borderRadius: 20,
}
```

## Fix 5: Manually Add a Territory to AsyncStorage

If nothing else works, add this code to your app to manually add a test territory:

```javascript
const addTestTerritory = async () => {
  // Create a sample territory
  const testTerritory = {
    _id: "test123", 
    name: "Test Zone",
    description: "Added manually",
    coordinates: [
      { latitude: 52.519474, longitude: 13.406362 },
      { latitude: 52.519574, longitude: 13.407362 },
      { latitude: 52.519374, longitude: 13.407362 },
    ],
    animal: "67c09ed47cc49613b81b315e", // Morka's ID
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Get existing territories
  const existingJson = await AsyncStorage.getItem('territories');
  const existing = existingJson ? JSON.parse(existingJson) : [];
  
  // Add the test territory
  const updated = [...existing, testTerritory];
  
  // Save back to AsyncStorage
  await AsyncStorage.setItem('territories', JSON.stringify(updated));
  
  Alert.alert("Test territory added!");
}

// Call this function somewhere
addTestTerritory();
``` 