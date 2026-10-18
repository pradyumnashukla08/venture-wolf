// Single source of truth for the backend API URL.
// Uses the EXPO_PUBLIC_API_URL environment variable, falling back to the deployed Firebase URL.
// If you want to test with a local backend, create a .env file and set EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3001/api
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api-45dvc4s67a-uc.a.run.app/api';
