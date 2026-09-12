import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30s timeout — Render free tier can take up to 30s cold start
});

// ── Request Interceptor: attach auth token ──────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ── Response Interceptor: handle errors gracefully ──────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Auto-retry once on network error or timeout (Render cold start)
    if (
      !originalRequest._retried &&
      (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || !error.response)
    ) {
      originalRequest._retried = true;
      console.warn('[API] Retrying request after network error:', originalRequest.url);
      return api(originalRequest);
    }

    // Auto-logout on 401 (expired/invalid token)
    if (error.response?.status === 401 && !originalRequest._authRetried) {
      originalRequest._authRetried = true;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      // Redirect to login only if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
