// Single source of truth for the backend API URL.
// Uses the EXPO_PUBLIC_API_URL environment variable, falling back to the deployed Render URL.
// If you want to test with a local backend, create a .env file and set EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:8080/api
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://venture-wolf-25me.onrender.com/api';
