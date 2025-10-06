import axios from 'axios';

const apiClient = axios.create({
  // IMPORTANT: Replace with your actual backend URL.
  // For an Android emulator, this is typically http://10.0.2.2:PORT
  baseURL: 'http://172.20.10.3:6000/api',
  // baseURL: 'https://mediremind-xh4e.onrender.com/api', 

  
  // This is the magic ingredient. It tells Axios to automatically
  // send and receive cookies with every request.
  withCredentials: true, 
});

export default apiClient;

