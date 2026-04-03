// src/utils/api.js
// Central axios instance - all API calls go through here

import axios from 'axios';

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,  // send session cookie with every request
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor - handle session expiry globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
  // Only redirect if NOT already on login page
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}
    return Promise.reject(error);
  }
);

export default api;
