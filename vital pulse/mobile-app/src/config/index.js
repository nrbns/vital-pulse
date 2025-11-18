// API Configuration
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
export const WS_BASE_URL = process.env.API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000';

// FCM Configuration
export const FCM_SENDER_ID = process.env.FCM_SENDER_ID || '';

// Maps Configuration
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// Environment
export const NODE_ENV = process.env.NODE_ENV || 'development';

