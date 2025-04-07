import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack>
      {/* Define the Login screen with header hidden */}
      <Stack.Screen 
        name="Login"   // Use the correct screen name
        options={{ headerShown: false }}  // Hide header for the Login screen
      />

      {/* Define the Register screen with header hidden */}
      <Stack.Screen 
        name="Register"   // Use the correct screen name
        options={{ headerShown: false }}  // Hide header for the Register screen
      />
    </Stack>
  );
}
