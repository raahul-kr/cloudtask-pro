import axios from 'axios'

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' })
const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cloudtask.accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use((response) => response, async (error: unknown) => {
  const failure = error as { config?: { url?: string; headers?: Record<string, string>; _retry?: boolean }; response?: { status?: number } }
  const request = failure.config
  if (failure.response?.status !== 401 || !request || request._retry || request.url?.startsWith('/auth/')) throw error
  const refreshToken = localStorage.getItem('cloudtask.refreshToken')
  if (!refreshToken) throw error
  request._retry = true
  try {
    const { data } = await axios.post(`${apiBase}/auth/refresh`, { refreshToken })
    localStorage.setItem('cloudtask.accessToken', data.accessToken)
    localStorage.setItem('cloudtask.refreshToken', data.refreshToken)
    request.headers = request.headers || {}
    request.headers.Authorization = `Bearer ${data.accessToken}`
    return api(request)
  } catch (refreshError) {
    for (const key of ['cloudtask.user', 'cloudtask.accessToken', 'cloudtask.refreshToken']) localStorage.removeItem(key)
    window.location.assign('/login')
    throw refreshError
  }
})
