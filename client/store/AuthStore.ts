import { create } from 'zustand';
import apiClient from '../api/apiClient';

// Define the shape of the user object
interface User {
  id: string;
  email: string;
  name: string;
  emergencyContact: string;
}

// Define the shape of the data for updating a user
interface UpdateUserDto {
  name?: string;
  emergencyContact?: string;
}

// Define the shape of the Zustand store's state and actions
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuthStatus: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, emergencyContact: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (userData: UpdateUserDto) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  checkAuthStatus: async () => {
    try {
      // This protected route will succeed if a valid session cookie exists
      const response = await apiClient.get('/users/me');
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch (error) {
      // If it fails, the user is not authenticated
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    set({ user: response.data.user, isAuthenticated: true });
  },

  signup: async (name, email, password, emergencyContact) => {
    const response = await apiClient.post('/auth/signup', { name, email, password, emergencyContact });
    set({ user: response.data.user, isAuthenticated: true });
  },

  logout: async () => {
    await apiClient.post('/auth/logout');
    set({ user: null, isAuthenticated: false });
  },

  /**
   * Updates the user's profile information.
   * @param userData - An object containing the name and/or emergencyContact to update.
   */
  updateUserProfile: async (userData: UpdateUserDto) => {
    try {
      const response = await apiClient.put('/users/me', userData);
      // On success, update the user state with the new data from the server
      set({ user: response.data });
    } catch (error) {
      console.error("Failed to update user profile:", error);
      // Re-throw the error so the UI can catch it and show an alert
      throw error;
    }
  },
}));

