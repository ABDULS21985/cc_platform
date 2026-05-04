import axios from 'axios';
import { toast } from 'sonner';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://cc-pay-666057252406.europe-west1.run.app/api',
  timeout: 100000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // You can add auth tokens here if needed in the future
    // Add auth token if available
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('access_token');
        if (token) {
             config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
// axiosInstance.interceptors.response.use(
//   (response) => {
//     return response;
//   },
//   (error) => {
//     const message = error.response?.data?.message || 'Something went wrong';
    
//     // Show toast for error
//     toast.error(message);
    
//     // Handle specific status codes if needed
//     if (error.response?.status === 401) {
//       // Handle unauthorized (e.g., redirect to login)
//       // window.location.href = '/login';
//     }

//     return Promise.reject(error);
//   }
// );

export default axiosInstance;
