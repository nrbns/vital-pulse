import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('refreshToken');
      // Navigate to login (handled by app)
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// Auth endpoints
export const auth = {
  requestOTP: (phone, countryCode) => 
    api.post('/auth/otp/request', { phone, countryCode }),
  
  verifyOTP: (phone, otp) => 
    api.post('/auth/otp/verify', { phone, otp }),
  
  refreshToken: (refreshToken) => 
    api.post('/auth/refresh', { refreshToken })
};

// User endpoints
export const users = {
  getProfile: () => 
    api.get('/users/me'),
  
  updateProfile: (data) => 
    api.put('/users/me', data),
  
  updateLocation: (latitude, longitude) => 
    api.put('/users/me/location', { latitude, longitude })
};

// Donor endpoints
export const donors = {
  register: (data) => 
    api.post('/donors/register', data),
  
  getProfile: () => 
    api.get('/donors/me'),
  
  getHistory: () => 
    api.get('/donors/me/history'),
  
  checkEligibility: () => 
    api.get('/donors/me/eligibility'),
  
  updatePresence: (isAvailable, latitude, longitude) => 
    api.patch('/donors/me/presence', { isAvailable, latitude, longitude }),
  
  getPresence: () => 
    api.get('/donors/me/presence'),
  
  getNearby: (latitude, longitude, radius = 50, bloodGroup, countryCode) => 
    api.get('/donors/nearby', { 
      params: { latitude, longitude, radius, bloodGroup, countryCode } 
    })
};

// Emergency/Blood Request endpoints
export const emergencies = {
  create: (data) => 
    api.post('/blood-requests', data),
  
  getAll: (latitude, longitude, radius = 50, bloodGroup, urgency) => 
    api.get('/blood-requests', {
      params: { latitude, longitude, radius, bloodGroup, urgency }
    }),
  
  getById: (id, latitude, longitude) => 
    api.get(`/blood-requests/${id}`, {
      params: { latitude, longitude }
    }),
  
  respond: (id, available, estimatedArrival, responseType = 'donor') => 
    api.post(`/blood-requests/${id}/respond`, {
      available,
      estimatedArrival,
      responseType
    }),
  
  getResponses: (id) => 
    api.get(`/blood-requests/${id}/responses`),
  
  report: (id, reason, details) => 
    api.post(`/blood-requests/${id}/report`, { reason, details })
};

// Hospital endpoints
export const hospitals = {
  getNearby: (latitude, longitude, radius = 25, emergency = true, openNow = false) => 
    api.get('/emergency/hospitals', {
      params: { latitude, longitude, radius, emergency, openNow }
    }),
  
  getById: (id) => 
    api.get(`/emergency/hospitals/${id}`),
  
  getBloodBanks: (latitude, longitude, radius = 50, bloodGroup) => 
    api.get('/emergency/blood-banks', {
      params: { latitude, longitude, radius, bloodGroup }
    }),
  
  register: (data) => 
    api.post('/hospitals/register', data),
  
  updateProfile: (data) => 
    api.put('/hospitals/me', data)
};

// Events endpoints
export const events = {
  getAll: (latitude, longitude, radius = 50, upcoming = true) => 
    api.get('/events', {
      params: { latitude, longitude, radius, upcoming }
    }),
  
  getById: (id) => 
    api.get(`/events/${id}`),
  
  register: (id, userId, donorId) => 
    api.post(`/events/${id}/register`, { userId, donorId }),
  
  create: (data) => 
    api.post('/events', data)
};

// Safety endpoints
export const safety = {
  getDisclaimer: (countryCode) => 
    api.get('/safety/disclaimer', {
      params: { countryCode }
    }),
  
  acceptDisclaimer: () => 
    api.post('/safety/disclaimer/accept'),
  
  getPrivacy: () => 
    api.get('/safety/privacy'),
  
  updatePrivacy: (settings) => 
    api.put('/safety/privacy', settings)
};

// Region endpoints
export const regions = {
  getConfig: (countryCode) => 
    api.get(`/regions/${countryCode}/config`),
  
  getAll: () => 
    api.get('/regions')
};

// Token management
export const tokens = {
  save: async (token, refreshToken) => {
    await AsyncStorage.setItem('authToken', token);
    if (refreshToken) {
      await AsyncStorage.setItem('refreshToken', refreshToken);
    }
  },
  
  get: async () => {
    return await AsyncStorage.getItem('authToken');
  },
  
  getRefresh: async () => {
    return await AsyncStorage.getItem('refreshToken');
  },
  
  remove: async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('refreshToken');
  }
};

export default api;

