/**
 * Axios client configuration with JWT token handling
 * Includes automatic token refresh on 401 responses
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

const DEFAULT_BACKEND_URL = 'https://balkanji-backend-ai5a.onrender.com';
const BLOCKED_BACKEND_URL = 'https://balkanji-backend.onrender.com';
export let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND_URL;

// Respect NEXT_PUBLIC_API_URL, but permanently block the deprecated backend domain.
if (API_BASE_URL.includes('balkanji-backend.onrender.com')) {
  if (typeof window !== 'undefined') {
    console.warn(`[API_BASE_URL] Blocked deprecated backend detected. Switching to: ${DEFAULT_BACKEND_URL}`);
  }
  API_BASE_URL = DEFAULT_BACKEND_URL;
}

// Keep old poison-domain guard as a safety fallback.
if (API_BASE_URL.includes('balkanjibari.org')) {
  if (typeof window !== 'undefined') {
    console.warn(`[Auto-Heal] Poisoned domain detected (balkanjibari.org). Forcing fallback to: ${DEFAULT_BACKEND_URL}`);
  }
  API_BASE_URL = DEFAULT_BACKEND_URL;
}

// --- DIAGNOSTIC LOGGING (v3.0) ---
if (typeof window !== 'undefined') {
  const isProd = process.env.NODE_ENV === 'production';
  const urlStatus = API_BASE_URL ? `CONNECTED: ${API_BASE_URL}` : 'MISSING / EMPTY';
  const bgColor = API_BASE_URL.includes('onrender.com') ? '#10b981' : (API_BASE_URL.includes('localhost') ? '#3b82f6' : '#ef4444');
  
  console.log(
    `%c API BASE URL %c ${urlStatus} `,
    "background: #374151; color: #fff; padding: 2px 5px; border-radius: 4px 0 0 4px; font-weight: bold;",
    `background: ${bgColor}; color: #fff; padding: 2px 5px; border-radius: 0 4px 4px 0; font-weight: bold;`
  );

  if (API_BASE_URL.includes(window.location.hostname) && isProd) {
    console.warn(
      "%c WARNING: API URL matches Frontend Hostname. %c\nThis usually causes 404/Timeout on production. Redirecting to Render fallback.",
      "background: #f59e0b; color: #000; font-weight: bold; padding: 5px;",
      "color: #f59e0b; font-weight: bold;"
    );
  }
}
// ---------------------------------

// Force global axios defaults to ensure no other instance uses a different timeout
axios.defaults.timeout = 120000;
axios.defaults.baseURL = API_BASE_URL;

/**
 * Standard utility to construct media URLs
 * Handles Cloudinary/absolute URLs and local media paths
 */
export const getMediaUrl = (path: string | undefined | null) => {
  if (!path) return null;
  
  let finalPath = path;

  // 1. Fix common database inconsistencies (e.g. hardcoded local IPs in a production DB)
  if (typeof path === 'string' && (path.includes('127.0.0.1:8000') || path.includes('localhost:8000'))) {
    // Strip the local host part to force use of the current API_BASE_URL
    finalPath = path.replace(/^https?:\/\/(127\.0\.0\.1|localhost):8000\/?/, '');
    console.warn(`[getMediaUrl] Sanitized local path: ${path} -> ${finalPath}`);
  }

  // 2. Return absolute URLs as is (after sanitization)
  if (finalPath.startsWith('http') || finalPath.startsWith('https')) {
    return finalPath;
  }
  
  if (finalPath.startsWith('data:')) return finalPath; // Handle base64 previews
  
  // 3. Clean up the base URL and path to ensure exactly one slash
  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  
  // Ensure we don't accidentally double-prefix if the path already looks like a relative media path
  const fixedPath = finalPath.startsWith('/') ? finalPath : `/${finalPath}`;
  
  const fullUrl = `${baseUrl}${fixedPath}`;
  
  // DEBUGGING: Log constructed URLs to help identify issues in the browser console
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    // console.debug(`[getMediaUrl] Input: ${path} | Final: ${fullUrl}`);
  }
  
  return fullUrl;
};

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, 
});

if (typeof window !== 'undefined') {
    console.log("%c SYSTEM: TIMEOUT SET TO 120000ms (v2.3) ", "background: #4f46e5; color: #fff; font-weight: bold; padding: 2px 5px; border-radius: 4px;");
}

// Global default override (Forever Fix)
axios.defaults.timeout = 120000;

// Force timeout on EVERY request just before it leaves
apiClient.interceptors.request.use((config) => {
    config.timeout = 120000;
    
    // @ts-ignore - store startTime to detect cold starts
    config.startTime = Date.now();
    
    // @ts-ignore - store startTime to detect cold starts
    config.startTime = Date.now();

    return config;
});

// Request interceptor - Add JWT token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      sessionStorage.getItem('access_token') ||
      localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // --- DIAGNOSTIC HEADER LOGGING (v3.0) ---
    const healingStatus = response.headers['x-student-healed'];
    const apiVersion = response.headers['x-api-version'];
    const userRole = response.headers['x-user-role'];
    
    if (apiVersion || healingStatus) {
      console.log(
        `%c API ${apiVersion || 'v1'} %c Healed: ${healingStatus || 'N/A'} %c Role: ${userRole || 'N/A'} `,
        "background: #4f46e5; color: #fff; padding: 2px 5px; border-radius: 4px 0 0 4px; font-weight: bold;",
        `background: ${healingStatus === 'True' ? '#10b981' : '#6b7280'}; color: #fff; padding: 2px 5px; font-weight: bold;`,
        "background: #374151; color: #fff; padding: 2px 5px; border-radius: 0 4px 4px 0; font-weight: bold;"
      );
    }
    // ----------------------------------------
    
    // @ts-ignore
    response.config.completed = true;
    return response;
  },
  async (error: AxiosError) => {
    // @ts-ignore
    error.config.completed = true;

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken =
        sessionStorage.getItem('refresh_token') ||
        localStorage.getItem('refresh_token');

      if (!refreshToken) {
        // No refresh token, redirect to login
        console.warn('Refresh token missing, clearing session.');
        sessionStorage.clear();
        window.location.href = '/';
        return Promise.reject(error);
      }

      try {
        // Attempt to refresh the token
        const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh/`, {
          refresh: refreshToken,
        });

        const { access, refresh } = response.data.data;

        // Store new tokens
        sessionStorage.setItem('access_token', access);
        sessionStorage.setItem('refresh_token', refresh);
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);

        // Update the failed request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access}`;
        } else {
          // @ts-ignore - Ensure headers are properly initialized for the retry
          originalRequest.headers = { Authorization: `Bearer ${access}` };
        }

        processQueue(null, access);
        isRefreshing = false;

        // Retry the original request
        return apiClient.request(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        isRefreshing = false;

        // Refresh failed, clear tokens and redirect to login
        console.error('Token refresh failed:', refreshError);
        sessionStorage.clear();
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
