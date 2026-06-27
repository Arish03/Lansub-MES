import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
})

// Inject JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lansub_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('lansub_token')
      localStorage.removeItem('lansub_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login: (username, password) => {
    const form = new FormData()
    form.append('username', username)
    form.append('password', password)
    return api.post('/api/auth/token', form)
  },
  me: () => api.get('/api/auth/me'),
  createUser: (data) => api.post('/api/auth/users', data),
  listUsers: () => api.get('/api/auth/users'),
}

export const assetsApi = {
  list: () => api.get('/api/assets/'),
  get: (id) => api.get(`/api/assets/${id}`),
  healthHistory: (id, limit = 100) => api.get(`/api/assets/${id}/health-history?limit=${limit}`),
}

export const telemetryApi = {
  get: (assetId, hours = 1, limit = 200) =>
    api.get(`/api/telemetry/${assetId}?hours=${hours}&limit=${limit}`),
  latestAll: () => api.get('/api/telemetry/latest/all'),
}

export const alarmsApi = {
  list: (params = {}) => api.get('/api/alarms/', { params }),
  acknowledge: (id) => api.put(`/api/alarms/${id}/acknowledge`),
  summary: () => api.get('/api/alarms/summary'),
}

export const reportsApi = {
  generate: (reportType) => api.post('/api/reports/generate', { report_type: reportType }),
  list: () => api.get('/api/reports/'),
}

export const reliabilityApi = {
  get: (assetId) => api.get(`/api/reliability/${assetId}`),
  all: () => api.get('/api/reliability/'),
}

export const maintenanceApi = {
  list: (assetId) => assetId ? api.get(`/api/maintenance/${assetId}`) : api.get('/api/maintenance/'),
  add: (record) => api.post('/api/maintenance/', record),
  stats: () => api.get('/api/maintenance/summary/stats'),
}

export default api
