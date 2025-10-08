import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';
import { AxiosError } from 'axios';

// --- TYPE DEFINITIONS ---

/**
 * Defines the shape of the User object.
 */
interface User {
  id: string;
  email: string;
  name: string;
  emergencyContact: string;
}

/**
 * Defines the shape of the data for updating a user's profile.
 * All fields are optional.
 */
interface UpdateUserDto {
  name?: string;
  emergencyContact?: string;
}


/**
 * Defines the shape of the state managed by the store.
 */
interface AuthState {
  user: User | null;
  sessionToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Defines the actions (functions) available in the store.
 */
interface AuthActions {
  signup: (name: string, email: string, password: string, emergencyContact: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  handleTokenRefresh: () => Promise<void>;
  updateUserProfile: (userData: UpdateUserDto) => Promise<void>;
}

/**
 * Combines the state and actions into a single type for the store.
 */
type AuthStore = AuthState & AuthActions;


// --- ZUSTAND STORE ---

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // --- INITIAL STATE ---
      user: null,
      sessionToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true, // Start loading on app launch to check auth status
      error: null,

      // --- ACTIONS ---

      signup: async (name, email, password, emergencyContact) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.post<{ user: User; sessionToken: string; refreshToken: string }>('/auth/signup', {
            name, email, password, emergencyContact,
          });
          const { user, sessionToken, refreshToken } = response.data;
          set({ user, sessionToken, refreshToken, isAuthenticated: true, isLoading: false });
        } catch (err) {
          const error = err as AxiosError<{ message: string }>;
          const errorMessage = error.response?.data?.message || 'Signup failed. Please try again.';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.post<{ user: User; sessionToken: string; refreshToken: string }>('/auth/login', { email, password });
          const { user, sessionToken, refreshToken } = response.data;
          set({ user, sessionToken, refreshToken, isAuthenticated: true, isLoading: false });
        } catch (err) {
          const error = err as AxiosError<{ message: string }>;
          const errorMessage = error.response?.data?.message || 'Invalid credentials. Please try again.';
          set({ error: errorMessage, isLoading: false, isAuthenticated: false });
          throw new Error(errorMessage);
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await apiClient.post('/auth/logout', { refreshToken: get().refreshToken });
        } catch (err) {
          const error = err as AxiosError<{ message: string }>;
          console.error("Logout API call failed, but logging out on client anyway.", error.response?.data?.message);
        } finally {
          set({ user: null, sessionToken: null, refreshToken: null, isAuthenticated: false, isLoading: false, error: null });
        }
      },
      
      checkAuthStatus: async () => {
        // This check runs on app startup. If a token exists, this API call will validate it.
        try {
          // Assuming you have a '/users/me' or similar protected route
          const response = await apiClient.get<User>('/users/me'); 
          set({ user: response.data, isAuthenticated: true, isLoading: false });
        } catch (error) {
          // If the call fails (e.g., 401), the token is invalid or expired.
          set({ user: null, sessionToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
        }
      },

      handleTokenRefresh: async () => {
        try {
          const response = await apiClient.post<{ sessionToken: string; refreshToken: string }>('/auth/refresh-token', {
            refreshToken: get().refreshToken,
          });
          const { sessionToken, refreshToken: newRefreshToken } = response.data;
          set({ sessionToken, refreshToken: newRefreshToken });
        } catch (error) {
          console.error('Failed to refresh token, logging out.');
          get().logout();
          throw error;
        }
      },

      /**
       * Updates the user's profile information.
       * @param userData - An object containing the name and/or emergencyContact to update.
       */
      updateUserProfile: async (userData: UpdateUserDto) => {
        try {
          // Assuming your API returns the fully updated user object
          const response = await apiClient.put<User>('/users/me', userData);
          
          // Update the user in the store with the new data from the server
          set({ user: response.data });
        } catch (err) {
          const error = err as AxiosError<{ message: string; msg?: string }>;
          console.error("Failed to update user profile:", error.response?.data?.message);

          // Extract the specific error message from the server's response
          const errorMessage = error.response?.data?.message || error.response?.data?.msg || 'An unknown error occurred during profile update.';
          
          // Re-throw a new, simple error with the specific message so the UI can display it
          throw new Error(errorMessage);
        }
      },

    }),
    {
      // --- PERSISTENCE CONFIGURATION ---
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): Partial<AuthStore> => ({
        user: state.user,
        sessionToken: state.sessionToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

