/**
 * ADAM-1 Enhanced API Client
 * ==========================
 * Centralized Axios instance for all backend API calls.
 * Uses VITE_API_URL environment variable (falls back to localhost).
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

export const apiClient = axios.create({
  baseURL: BASE_URL ? `${BASE_URL}/api` : '/api',
  timeout: 30_000, // 30s accommodates cloud/free-tier cold starts
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// ── Request interceptor ──────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => Promise.reject(error),
)

// ── Response interceptor with retry for cold starts ─────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config
    // Retry idempotent GET requests once if network error or timeout
    if (config && config.method === 'get' && !config._retry) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('Network Error') || !error.response) {
        config._retry = true
        await new Promise((resolve) => setTimeout(resolve, 2000))
        return apiClient(config)
      }
    }

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

/**
 * Fetch ML benchmarks across models and seeds.
 * @returns {Promise<{total_experiments: number, models: object}>}
 */
export const fetchMlBenchmark = () =>
  apiClient.get('/ml/benchmark').then((r) => r.data)

/**
 * Fetch AI and Literature RAG status.
 * @returns {Promise<{status: string, active_provider: string, indexed_articles: number, agents_available: Array<string>}>}
 */
export const fetchAiStatus = () =>
  apiClient.get('/ai/status').then((r) => r.data)

/**
 * Fetch ADAM vs traditional ML performance comparison.
 * @param {boolean} refresh - Force re-evaluation of models
 * @returns {Promise<{published_benchmark: object, current_evaluation: object}>}
 */
export const fetchPerformanceComparison = (refresh = false) =>
  apiClient.get(`/ml/performance/comparison?refresh=${refresh}`).then((r) => r.data)

/**
 * Execute end-to-end multi-agent ADAM diagnostic workflow on a patient record.
 * @param {string} sampleId
 * @returns {Promise<object>}
 */
export const executeAdamWorkflow = (sampleId) =>
  apiClient.post('/ml/workflow/execute', { sample_id: sampleId }).then((r) => r.data)

/**
 * Fetch list of available cohort samples with clinical indicators.
 * @param {number} limit
 * @returns {Promise<Array<object>>}
 */
export const fetchAvailableSamples = (limit = 100) =>
  apiClient.get(`/ml/samples?limit=${limit}`).then((r) => r.data)


