import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      navigate(`/${user.role}`)
    } catch (err) {
      setError(err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Login gagal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pupr-blue-dark to-pupr-blue px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6 text-white">
          <img src="/logo-pu.jpg" alt="Logo Kementerian PU" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 shadow-lg" />
          <h1 className="text-xl font-semibold">SIPINTER</h1>
          <p className="text-white/70 text-sm">Sistem Monitoring Progres Kerja Internal Bapekom PU Wilayah I Medan</p>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4 bg-white">
          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div>
            <label className="label">Email</label>
            <input
              type="email" required
              className="input focus:ring-pupr-blue-light"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@pu.go.id"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} required
                className="input focus:ring-pupr-blue-light pr-10"
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit" disabled={loading}
            className="btn w-full bg-pupr-yellow text-pupr-blue-dark font-semibold hover:bg-pupr-yellow-dark disabled:opacity-60"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}