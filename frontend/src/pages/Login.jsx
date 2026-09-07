import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    setError(err.response?.data?.message || 'Login gagal. Periksa email/password Anda.')
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
          {/* Header biru dengan aksen garis kuning */}
          <div className="bg-pupr-blue px-8 pt-8 pb-6 relative">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-pupr-yellow" />
            <h1 className="text-xl font-bold text-white mb-1">Progress Tugas Balai</h1>
            <p className="text-sm text-blue-100">
              Balai Pengembangan Kompetensi PU Wilayah I Medan
            </p>
          </div>

          <div className="px-8 py-6">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-3 py-2 mb-4">
                {error}
              </div>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-pupr-blue-light focus:border-transparent transition"
              placeholder="nama@pu.go.id"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-6 text-sm focus:outline-none focus:ring-2 focus:ring-pupr-blue-light focus:border-transparent transition"
              placeholder="••••••••"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pupr-yellow hover:bg-pupr-yellow-dark text-pupr-blue-dark rounded-lg py-2.5 font-semibold text-sm transition disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Kementerian Pekerjaan Umum dan Perumahan Rakyat
        </p>
      </div>
    </div>
  )
}
