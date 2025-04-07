# How to Fix Common Errors

## Step 1: Kill processes using the required ports

The most common error is "address already in use" for ports 3001 and 8081. Fix this by:

```powershell
# Check for processes using port 3001
netstat -ano | findstr :3001

# Kill the process (replace XXXX with the PID number from above)
taskkill /PID XXXX /F

# Check for processes using port 8081
netstat -ano | findstr :8081

# Kill the process (replace XXXX with the PID number from above)
taskkill /PID XXXX /F
```

## Step 2: Make sure your backend folder path is correct

The backend should be in: `C:\Users\Arculus\Desktop\Bacheolor\Backend\MyBachelor_Backend-main\MyBachelor_Backend-main`

If you get `Error: Cannot find module 'index.js'`, you're in the wrong directory. Make sure to navigate to the correct folder:

```powershell
cd C:\Users\Arculus\Desktop\Bacheolor\Backend\MyBachelor_Backend-main\MyBachelor_Backend-main
node index.js
```

## Step 3: Fix the API URL in environments.js

If you still have connection issues, update the IP address in `app/constants/environments.js`:

1. Find your actual IP address:
   ```
   ipconfig
   ```
   Look for IPv4 Address, something like 192.168.x.x

2. Update the API_BASE_URL to use your IP:
   ```js
   API_BASE_URL: 'http://YOUR_IP_ADDRESS:3001',
   ```

## Step 4: Use the correct Expo command

Use the new Expo CLI commands:

```powershell
# Navigate to frontend folder
cd C:\Users\Arculus\Desktop\Bacheolor\Fronted\MyBachelor-testing

# Install dependencies if needed
npm install

# Start Expo with the new command
npx expo start
```

## Step 5: How to fix "response.json is not a function" error

This error happens when the code tries to call `json()` on a response that was already parsed. Our fixes:

1. In SafeZone.js, we fixed the fetchWithMultipleEndpoints function
2. In the loadAnimals and loadTerritories functions, we removed duplicate json() calls

## Step 6: Safe Zone Button Not Working - Fixed

We completely rewrote the saveTerritory function to:
1. Save to local storage first for immediate feedback
2. Update the UI before making API calls
3. Show the territory on the map right away
4. Properly handle API errors

## Step 7: Alert for animals outside safe zones - Fixed

We improved the checkSafeZones function to:
1. Properly detect when animals leave their safe zones
2. Show alerts only for newly unsafe animals
3. Add defensive null/undefined checks

## Step 8: Missing territories after saving - Fixed

The territories now show immediately after saving because:
1. We update the local state with the new territory first
2. Save to AsyncStorage for persistence
3. Center the map on the new territory
4. Only then try to save to the API

## Common Error Messages and Solutions:

1. **"Network request failed"**: Your backend server isn't running or isn't accessible
   - Make sure backend is running
   - Check IP address in environments.js

2. **"Route is missing the required default export"**: 
   - The SafeZone.js had a syntax error that we fixed

3. **"EADDRINUSE: address already in use"**:
   - Kill the process using that port (see Step 1)

4. **"SyntaxError: JSON Parse error"**:
   - The API response is not valid JSON, usually because the API returned HTML error page
   - Check that your backend is running and accessible 