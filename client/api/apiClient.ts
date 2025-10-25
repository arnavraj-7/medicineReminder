// import axios from 'axios';

// // Create an Axios instance
// const apiClient = axios.create({
//   baseURL: 'https://medicinereminder-mugz.onrender.com/api',
//   // baseURL: 'http://192.168.29.210:6000/api',

//   withCredentials: true, // This can still stay if you want to use cookies later
// });

// // Add a request interceptor to send the userId header automatically
// apiClient.interceptors.request.use(
//  (config) => {
//     if (config.url && !config.url.includes('/auth/login') && !config.url.includes('/auth/signup')) {
//       const userId = localStorage.getItem('userId'); // Or AsyncStorage in Expo
//       config.headers['x-user-id'] = userId || null; // Explicit null if missing
//     }
//     return config;
//      },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// export default apiClient;
// src/api/apiClient.js
import axios from 'axios';
import { useAuthStore } from '../store/AuthStore';

const API_BASE_URL = 'https://medicinereminder-mugz.onrender.com/api'; 
// const API_BASE_URL = 'http://192.168.29.210:6000/api'; 

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Request Interceptor (adds the session token to every request)
apiClient.interceptors.request.use(
  (config) => {
    const { sessionToken } = useAuthStore.getState();
    if (sessionToken) {
      config.headers.Authorization = `Bearer ${sessionToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// A variable to prevent infinite loops of token refresh calls
let isRefreshing = false;

// Response Interceptor (handles expired session tokens)
apiClient.interceptors.response.use(
  (response) => response, // If the response is successful, just return it
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is 401 and it's not a retry request
    if (error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If we are already refreshing the token, just return the promise to wait
        return Promise.reject(error);
      }
      
      originalRequest._retry = true; // Mark this request as a retry
      isRefreshing = true;

      try {
        // Call the refreshToken action from your Zustand store
        await useAuthStore.getState().handleTokenRefresh();
        
        // The store is now updated with the new token.
        // The request interceptor will automatically use the new sessionToken.
        isRefreshing = false;
        
        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        // If refreshing fails, the user is logged out by the store action.
        return Promise.reject(refreshError);
      }
    }
    // For all other errors, just reject the promise
    return Promise.reject(error);
  }
);

export default apiClient;