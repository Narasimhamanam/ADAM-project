/**
 * ADAM-1 Enhanced API Client
 * ==========================
 * Centralized Axios instance for all backend API calls.
 * Uses VITE_API_URL environment variable (falls back to localhost).
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// ── Request interceptor ──────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    // Future: attach auth token here
    return config
  },
  (error) => Promise.reject(error),
)

// ── Response interceptor ─────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(message))
  },
)

// ── API service methods ──────────────────────────────────────────────────

/**
 * Fetch backend health status.
 * @returns {Promise<{status: string, database: string, uptime_seconds: number, version: string, environment: string, timestamp: string}>}
 */
export const fetchHealth = () =>
  apiClient.get('/health').then((r) => r.data)

/**
 * Fetch system runtime information.
 * @returns {Promise<object>}
 */
export const fetchSystemInfo = () =>
  apiClient.get('/system/info').then((r) => r.data)

/**
 * Fetch dataset metadata list.
 * @returns {Promise<{total: number, datasets: Array}>}
 */
export const fetchDatasets = () =>
  apiClient.get('/datasets').then((r) => r.data)
