import axios from 'axios'

// Tulis langsung URL Railway agar tidak tergantung pada Vercel Env Var
const baseURL = 'https://sipinter-pu-production.up.railway.app/api'

const api = axios.create({ 
  baseURL: baseURL,
  maxRedirects: 0
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