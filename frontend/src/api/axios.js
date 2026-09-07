import axios from 'axios'

// Backend Express.js sekarang berjalan terpisah (server sendiri).
// Saat dev: proxy '/api' -> VITE proxy ke backend (lihat vite.config.js).
// Saat production: set VITE_API_URL ke URL backend, contoh: https://api.domainanda.go.id/api
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

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
