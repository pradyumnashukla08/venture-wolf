import { Platform } from 'react-native';

// Use the environment variable for the API URL, falling back to a default local IP for physical devices.
// 10.0.2.2 only works on emulators, so we default to the physical IP address detected earlier.
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.31.151:3000/api';
