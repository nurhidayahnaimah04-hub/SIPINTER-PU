import { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) { setLoading(false); return }
    api.get('/me')
      .then((res) => {
        setUser(res.data)
        sessionStorage.setItem('user', JSON.stringify(res.data))
      })
      .catch(() => {
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const res = await api.post('/login', { email, password })
    sessionStorage.setItem('token', res.data.token)
    sessionStorage.setItem('user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data.user
  }

  async function logout() {
    try { await api.post('/logout') } catch (e) { /* ignore */ }
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    setUser(null)
  }

  function updateUser(newUser) {
    setUser(newUser)
    sessionStorage.setItem('user', JSON.stringify(newUser))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
} 