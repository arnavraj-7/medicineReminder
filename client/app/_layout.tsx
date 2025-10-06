import React, { useEffect } from 'react';
import { Stack, useRouter, SplashScreen } from 'expo-router';
import { ThemeProvider } from '@/context/ThemeContext';
import { useAuthStore } from '@/store/AuthStore';

// Prevent the splash screen from auto-hiding before we can check the auth status.
SplashScreen.preventAutoHideAsync();

/**
 * This component handles the core navigation and authentication-based redirection.
 */
function RootLayoutNav() {
  // Get the session state and check function from our simplified auth store.
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuthStore();
  const router = useRouter();

  // On initial app load, call checkAuthStatus to see if there's an active session.
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // This effect handles redirecting the user based on their authentication status.
  useEffect(() => {
    // If we are still checking for a session, do nothing. The splash screen is visible.
    if (isLoading) {
      return;
    }

    // Once the check is complete, hide the splash screen.
    SplashScreen.hideAsync();

    // The user has a valid session, so navigate them to the main app.
    if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      // The user does not have a session, so send them to the login screen.
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]); // Re-run this logic when the auth or loading state changes.

  // The Stack navigator defines all possible routes. The redirection logic above
  // ensures the user only sees the routes they are allowed to access.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="medicine/add" />
      <Stack.Screen
        name="medicine/[id]"
        options={{
          presentation: 'card',
        }}
      />
    </Stack>
  );
}

/**
 * The main root layout component that wraps the entire app with necessary providers.
 */
export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

