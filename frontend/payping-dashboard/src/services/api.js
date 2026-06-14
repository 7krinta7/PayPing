// Thin axios wrapper that attaches the JWT from localStorage to every request.
// The base URL is configured via VITE_API_URL in .env.

import axios from 'axios';
import { getToken } from '../utils/tokenStorage';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
