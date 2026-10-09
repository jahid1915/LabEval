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

// ── Client-Side In-Memory Cache & In-Flight Deduplication ─────────
const cacheMap = new Map();
const inFlightMap = new Map();
const DEFAULT_CACHE_TTL = 30 * 1000; // 30 seconds

// Endpoints that are safe and beneficial to cache for rapid UI navigation
const CACHEABLE_ROUTES = [
  '/faculties',
  '/departments',
  '/academic/sessions',
  '/academic/series',
  '/academic/current-info',
  '/academic/semesters',
  '/courses',
  '/head/courses/sessional',
  '/head/courses/elective',
  '/head/academic-sessions',
  '/head/stats',
  '/admin/stats',
  '/admin/dashboard/summary',
  '/auth/me'
];

const isCacheable = (url) => {
  return CACHEABLE_ROUTES.some(route => url && url.includes(route));
};

const originalGet = api.get.bind(api);

api.get = function(url, config = {}) {
  const shouldCache = config.cache !== false && !config.headers?.['x-cache-bypass'] && isCacheable(url);
  const cacheKey = `${url}_${JSON.stringify(config.params || {})}`;

  if (shouldCache) {
    const cached = cacheMap.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return Promise.resolve({ ...cached.response, fromCache: true });
    }

    if (inFlightMap.has(cacheKey)) {
      return inFlightMap.get(cacheKey);
    }
  }

  const promise = originalGet(url, config)
    .then((response) => {
      if (shouldCache && response && response.status === 200) {
        cacheMap.set(cacheKey, {
          response: { ...response },
          expiresAt: Date.now() + (config.cacheTTL || DEFAULT_CACHE_TTL)
        });
      }
      return response;
    })
    .finally(() => {
      inFlightMap.delete(cacheKey);
    });

  if (shouldCache) {
    inFlightMap.set(cacheKey, promise);
  }

  return promise;
};

api.clearCache = () => {
  cacheMap.clear();
  inFlightMap.clear();
};

// ── Response Interceptor: handle errors & cache invalidation ─────
api.interceptors.response.use(
  (response) => {
    // Invalidate client cache on any write/mutation operation
    const method = (response.config?.method || 'get').toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      api.clearCache();
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Auto-retry once on network error or timeout ONLY for safe idempotent read methods (Render cold start)
    const method = (originalRequest?.method || 'get').toLowerCase();
    const isSafeIdempotent = ['get', 'head', 'options'].includes(method);

    if (
      originalRequest &&
      !originalRequest._retried &&
      isSafeIdempotent &&
      (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || !error.response)
    ) {
      originalRequest._retried = true;
      console.warn('[API] Retrying safe idempotent request after network error:', originalRequest.url);
      return api(originalRequest);
    }

    // Auto-logout on 401 (expired/invalid token)
    if (error.response?.status === 401 && !originalRequest?._authRetried) {
      if (originalRequest) originalRequest._authRetried = true;
      api.clearCache();
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      // Never force-redirect if user is on /admin, /login, /signup, /auth, or public root
      const currentPath = window.location.pathname;
      const isPublicOrAdmin = currentPath === '/' ||
        currentPath.includes('/login') ||
        currentPath.includes('/signup') ||
        currentPath.includes('/auth') ||
        currentPath.startsWith('/admin');

      // Only redirect protected student/teacher routes to login
      if (!isPublicOrAdmin) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
