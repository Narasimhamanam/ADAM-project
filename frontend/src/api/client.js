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
 *
 * Uses a 90-second timeout exclusively for this endpoint because:
 *   - Normal response (cache hit): < 20 ms
 *   - Cold-start fresh compute (first-ever request): 5–15 s
 *   - Results are persisted to disk after first run; all subsequent requests hit cache.
 *
 * @param {boolean} refresh - Force re-evaluation of models
 * @param {string} protocol - 'full_cohort' or 'paper_reconstructed'
 * @param {number} seed - Random seed for evaluation split
 * @returns {Promise<{published_benchmark: object, current_evaluation: object, ablation_study: object, efficiency_metrics: object}>}
 */
export const fetchPerformanceComparison = (refresh = false, protocol = 'full_cohort', seed = 42) =>
  apiClient
    .get(`/ml/performance/comparison?refresh=${refresh}&protocol=${protocol}&seed=${seed}`, {
      timeout: 90_000, // 90 s — handles rare cold-start; cached loads respond in < 20 ms
    })
    .then((r) => r.data)

/**
 * Fetch 7-condition ablation study results.
 * @param {boolean} refresh
 * @param {string} protocol
 * @returns {Promise<object>}
 */
export const fetchAblationStudy = (refresh = false, protocol = 'full_cohort') =>
  apiClient.get(`/ml/performance/ablation?refresh=${refresh}&protocol=${protocol}`).then((r) => r.data)

/**
 * Fetch computational efficiency and resource profiling metrics.
 * @param {number} sampleCount
 * @returns {Promise<object>}
 */
export const fetchEfficiencyMetrics = (sampleCount = 5) =>
  apiClient.get(`/ml/performance/efficiency?sample_count=${sampleCount}`).then((r) => r.data)

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

// ── Longitudinal Trajectory API methods ───────────────────────────────────

/**
 * Fetch all subjects with longitudinal summary metrics and optional filtering/pagination.
 * @param {object} params - Optional {page, page_size, diagnosis, search, is_longitudinal}
 * @returns {Promise<{total_subjects: number, subjects_with_repeated_samples: number, subjects: Array}>}
 */
export const fetchTrajectorySubjects = (params = {}) => {
  const query = new URLSearchParams()
  if (params.page) query.append('page', params.page)
  if (params.page_size) query.append('page_size', params.page_size)
  if (params.diagnosis && params.diagnosis !== 'all') query.append('diagnosis', params.diagnosis)
  if (params.search) query.append('search', params.search)
  if (params.is_longitudinal !== undefined && params.is_longitudinal !== null) {
    query.append('is_longitudinal', params.is_longitudinal)
  }
  const qs = query.toString()
  return apiClient.get(qs ? `/trajectory/subjects?${qs}` : '/trajectory/subjects').then((r) => r.data)
}

/**
 * Fetch complete longitudinal AD risk trajectory for a specific subject.
 * Default includeShap=false ensures lightweight browsing without triggering expensive TreeSHAP.
 * @param {string} subjectId
 * @param {boolean} includeShap
 * @param {number|null} maxHorizonDay
 * @returns {Promise<object>}
 */
export const fetchSubjectTrajectory = (subjectId, includeShap = false, maxHorizonDay = null) => {
  let url = `/trajectory/subjects/${encodeURIComponent(subjectId)}?include_shap=${includeShap}`
  if (maxHorizonDay !== null && maxHorizonDay !== undefined) {
    url += `&max_horizon_day=${maxHorizonDay}`
  }
  return apiClient.get(url).then((r) => r.data)
}


/**
 * Retrieve evidence-grounded literature (RAG) for an observation.
 * @param {string} subjectId
 * @param {string} sampleId
 * @returns {Promise<object>}
 */
export const fetchTrajectoryLiterature = (subjectId, sampleId) =>
  apiClient
    .get(`/trajectory/subjects/${encodeURIComponent(subjectId)}/sample/${encodeURIComponent(sampleId)}/literature`)
    .then((r) => r.data)

/**
 * Compare trajectories across multiple subjects side-by-side.
 * @param {Array<string>} subjectIds
 * @returns {Promise<{status: string, comparisons: Array, research_disclaimer: string}>}
 */
export const compareSubjectTrajectories = (subjectIds) =>
  apiClient.post('/trajectory/compare', { subject_ids: subjectIds }).then((r) => r.data)

/**
 * Fetch cohort-level trajectory coverage and validation evaluation.
 * @returns {Promise<object>}
 */
export const fetchTrajectoryEvaluation = () =>
  apiClient.get('/trajectory/evaluation').then((r) => r.data)

/**
 * Fetch risk model architectural capabilities and time-to-event status.
 * @returns {Promise<object>}
 */
export const fetchRiskModelCapabilities = () =>
  apiClient.get('/trajectory/capabilities').then((r) => r.data)

// ── Research Extensions (Options 2, 3, 4, 8) ─────────────────────────────

export const fetchResearchDatasets = (category = null) => {
  const url = category ? `/research/datasets?category=${encodeURIComponent(category)}` : '/research/datasets'
  return apiClient.get(url).then((r) => r.data)
}

export const fetchResearchDatasetById = (datasetId) =>
  apiClient.get(`/research/datasets/${encodeURIComponent(datasetId)}`).then((r) => r.data)

export const auditResearchDataset = (datasetId) =>
  apiClient.post(`/research/datasets/${encodeURIComponent(datasetId)}/audit`).then((r) => r.data)

export const fetchCrosswalkAudit = () =>
  apiClient.get('/research/id-matching/audit').then((r) => r.data)

export const checkMultimodalEligibility = (cohortId, subjectId, requestedModalities) =>
  apiClient.post('/research/multimodal/eligibility', {
    cohort_id: cohortId,
    subject_id: subjectId,
    requested_modalities: requestedModalities,
  }).then((r) => r.data)

export const fetchBenchmarkRuns = () =>
  apiClient.get('/research/benchmark/runs').then((r) => r.data)

export const fetchBenchmarkRunById = (runId) =>
  apiClient.get(`/research/benchmark/runs/${encodeURIComponent(runId)}`).then((r) => r.data)

export const fetchNeuroimagingSubjects = (cohortId = null) => {
  const url = cohortId ? `/research/neuroimaging/subjects?cohort_id=${encodeURIComponent(cohortId)}` : '/research/neuroimaging/subjects'
  return apiClient.get(url).then((r) => r.data)
}

export const fetchSubjectNeuroimaging = (subjectId) =>
  apiClient.get(`/research/neuroimaging/subjects/${encodeURIComponent(subjectId)}/sessions`).then((r) => r.data)

export const fetchModalityComparison = () =>
  apiClient.get('/research/neuroimaging/modality-comparison').then((r) => r.data)

export const fetchDigitalTwinParticipants = (cohortId = 'ADAM1_BASELINE') =>
  apiClient.get(`/research/digital-twin/participants?cohort_id=${encodeURIComponent(cohortId)}`).then((r) => r.data)

export const fetchDigitalTwinProfile = (cohortId, participantId) =>
  apiClient.get(`/research/digital-twin/${encodeURIComponent(cohortId)}/${encodeURIComponent(participantId)}`).then((r) => r.data)

export const fetchDigitalTwinTimeline = (cohortId, participantId) =>
  apiClient.get(`/research/digital-twin/${encodeURIComponent(cohortId)}/${encodeURIComponent(participantId)}/timeline`).then((r) => r.data)

export const fetchGardStatus = () =>
  apiClient.get('/research/gard/status').then((r) => r.data)

export const updateGardStatus = (status, notes, user = 'Researcher') =>
  apiClient.post('/research/gard/status', { status, notes, user }).then((r) => r.data)



