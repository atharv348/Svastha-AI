import axios from 'axios';

const defaultApiUrl = '/api';
const envApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
const baseURL = (envApiUrl || defaultApiUrl).replace(/\/+$/, '');

const api = axios.create({
  baseURL,
  timeout: 120000, // Increase timeout to 120 seconds for heavy AI features
});

console.log('API Base URL:', api.defaults.baseURL);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, { hasToken: !!token });
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  console.error('API Request Error:', error);
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      console.warn('Unauthorized! Redirecting to login...', error.config?.url);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
