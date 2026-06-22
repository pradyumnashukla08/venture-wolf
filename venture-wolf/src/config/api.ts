// Single source of truth for the backend API URL.
// Uses the EXPO_PUBLIC_API_URL environment variable, falling back to the deployed Render URL.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://venture-wolf-25me.onrender.com/api';
