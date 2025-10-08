import axios from 'axios';

// Create an Axios instance
const apiClient = axios.create({
  baseURL: 'https://medicinereminder-mugz.onrender.com/api',
  withCredentials: true, // This can still stay if you want to use cookies later
});

// Add a request interceptor to send the userId header automatically
apiClient.interceptors.request.use(
 (config) => {
    if (config.url && !config.url.includes('/auth/login') && !config.url.includes('/auth/signup')) {
      const userId = localStorage.getItem('userId'); // Or AsyncStorage in Expo
      config.headers['x-user-id'] = userId || null; // Explicit null if missing
    }
    return config;
     },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
