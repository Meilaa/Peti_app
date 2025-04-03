# MyBachelor Pet Tracker App

## Setup and Installation

### Backend Server

1. Open a terminal/command prompt
2. Navigate to the backend directory:
   ```
   cd C:\Users\Arculus\Desktop\Bacheolor\Backend\MyBachelor_Backend-main\MyBachelor_Backend-main
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server using the batch file:
   ```
   start-server.bat
   ```
   Or directly with Node:
   ```
   node index.js
   ```
5. Verify the server is running by visiting http://localhost:3001 in your browser
   - You should see "API is running..." message
   - Check API status at http://localhost:3001/admin/routes

### Frontend App

1. Open a new terminal/command prompt
2. Navigate to the frontend directory:
   ```
   cd C:\Users\Arculus\Desktop\Bacheolor\Fronted\MyBachelor-testing
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Install Expo CLI if needed:
   ```
   npm install -g expo-cli
   ```
5. Start the app:
   ```
   npx expo start
   ```
6. Use the Expo Go app on your phone or an emulator to run the app

## Troubleshooting

### API Connection Issues

If you see 404 errors or network connection failures:

1. Make sure the backend server is running
2. Check if the IP address in `app/constants/environments.js` matches your computer's IP
3. Try connecting using "localhost" or "127.0.0.1" instead
4. The app includes a fallback system that will save data locally if the API is unreachable

### Safe Zone Feature

The Safe Zone feature allows you to:
- Draw areas on a map to define safe zones for your pets
- Receive alerts when a pet leaves their safe zone
- View and manage all safe zones from the Account tab

If you experience issues with the Safe Zone feature:
1. Make sure the backend server is running
2. Check the network status indicator in the app header
3. The app will work in offline mode if needed and sync when connection is restored

## License

This application is proprietary and for educational purposes only.
