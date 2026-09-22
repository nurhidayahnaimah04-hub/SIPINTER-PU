import axios from 'axios'

// Otomatis bersihkan tanda '/' di akhir URL jika ada
const rawBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const baseURL = rawBaseURL.replace(/\/+$/, '')

const api = axios.create({ 
  baseURL: baseURL
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api