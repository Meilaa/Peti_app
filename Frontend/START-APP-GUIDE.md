# Pet Tracker App - Startup Guide

## Step 1: Fix the Port Issues First

You're seeing errors about ports being in use. Let's fix those first:

```
# Check for processes using port 3001
netstat -ano | findstr :3001

# Kill the process using the PID shown (replace <pid> with the actual number)
taskkill /PID <pid> /F

# Check for processes using port 8081
netstat -ano | findstr :8081

# Kill the process using the PID shown
taskkill /PID <pid> /F
```

## Step 2: Start the Backend Server

Make sure you're in the correct directory with the backend code:

```
# Navigate to the correct backend folder
cd C:\Users\Arculus\Desktop\Bacheolor\Backend\MyBachelor_Backend-main\MyBachelor_Backend-main

# Start the server
node index.js
```

You should see a message saying the server is running on port 3001.

## Step 3: Start the Frontend (Expo App)

In a NEW terminal window (keep the backend running in the first window):

```
# Navigate to the frontend folder
cd C:\Users\Arculus\Desktop\Bacheolor\Fronted\MyBachelor-testing

# Use npx to run expo
npx expo start
```

IMPORTANT: If it asks about using a different port because port 8081 is in use, answer YES.

## Troubleshooting

### If "response.json is not a function" error appears:

This error has been fixed in the code by ensuring we don't call .json() twice. We've updated:
- The fetchWithMultipleEndpoints function 
- The loadAnimals and loadTerritories functions

### If no territories appear after saving:

We've fixed this by:
1. Saving territories to local storage immediately
2. Updating the UI before the API call
3. Properly focusing the map on the newly created safe zone

### If you still have connection issues:

Update your IP address in `app/constants/environments.js`:

1. Find your IP address using:
   ```
   ipconfig
   ```

2. Update all API URLs with your actual IP:
   ```js
   API_BASE_URL: 'http://YOUR_ACTUAL_IP:3001',
   ```

### If Expo shows errors about CLI:

Use the most current commands:
```
npx expo start
```

NOT:
```
expo start
npm start
```

### Backend cannot be found error:

If you see `Error: Cannot find module 'index.js'` make sure you are in the correct directory. The backend code should be in:
```
C:\Users\Arculus\Desktop\Bacheolor\Backend\MyBachelor_Backend-main\MyBachelor_Backend-main
```

## Updating API URLs

If your backend is running but the app can't connect, you need to update the API URL:

1. Open `app/constants/environments.js`
2. Update the `API_BASE_URL` to match your computer's local IP address:
   ```js
   API_BASE_URL: 'http://YOUR_LOCAL_IP:3001'
   ```
3. You can find your IP using:
   ```
   ipconfig
   ```
   Look for the IPv4 Address of your network adapter.

## Safe Zone and Alert Issues

If the safe zone doesn't appear after saving or if alerts aren't working:

1. Make sure your backend server is running properly
2. Check that in `environments.js` the features are enabled:
   ```js
   FEATURES: {
     ENABLE_SAFE_ZONES: true,
     ENABLE_NOTIFICATIONS: true
   }
   ```
3. Clear AsyncStorage by reinstalling the app or using dev tools
4. If using a physical device, ensure it's connected to the same network as your development computer

## Error: "unsafeAnimals.includes is not a function"

This error occurs because the state variable was incorrectly initialized:

1. Ensure in Home.js that unsafeAnimals is initialized as an array:
   ```js
   const [unsafeAnimals, setUnsafeAnimals] = useState([]);
   ```
2. Make sure all uses of unsafeAnimals check for its existence before calling methods:
   ```js
   if (unsafeAnimals && unsafeAnimals.includes(animalId)) {
     // Do something
   }
   ``` 