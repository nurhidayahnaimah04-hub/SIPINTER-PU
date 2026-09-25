import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
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
    <div style={{ width: '100vw', minHeight: '100vh', display: 'flex', background: '#FFFFFF' }}>

      {/* PANEL KIRI: Identitas Instansi & Branding */}
      <div style={{ flex: '1.25', background: '#07142E', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '60px 72px', minWidth: '520px', borderRight: '5px solid #F2A90A', position: 'relative', overflow: 'hidden' }}>

        {/* Foto Gedung Background (Opacity 0.2 / 20%) */}
        <div style={{ position: 'absolute', top: '-10px', right: '-10px', bottom: '-10px', left: '-10px', backgroundImage: 'url(/gedung.jpeg)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.2, filter: 'grayscale(100%) blur(2px)', pointerEvents: 'none', zIndex: 1 }} />

        {/* Gradient Darkener */}
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: 'linear-gradient(180deg, rgba(7, 20, 46, 0.88) 0%, rgba(7, 20, 46, 0.96) 100%)', pointerEvents: 'none', zIndex: 2 }} />

        {/* Header Balai */}
        <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0, overflow: 'hidden', padding: '2px', boxShadow: '0 4px 14px rgba(0,0,0,0.5)' }}>
            <img src="/bapekom1.jpg" alt="Logo Bapekom I Medan" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
          </div>
          <div>
            <div style={{ color: '#F2A90A', fontWeight: 700, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px', lineHeight: 1 }}>
              Kementerian Pekerjaan Umum
            </div>
            <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '14px', lineHeight: 1.35, whiteSpace: 'nowrap' }}>
              Balai Pengembangan Kompetensi Pekerjaan Umum Wilayah I Medan
            </div>
          </div>
        </div>

        {/* Branding Utama SIPINTER */}
        <div style={{ position: 'relative', zIndex: 3, maxWidth: '540px', margin: '40px 0', display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ width: '90px', height: '90px', display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0, filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))' }}>
            <img src="/2.png" alt="Logo SIPINTER" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ margin: '0 0 4px 0', fontWeight: 800, fontSize: '54px', color: '#FFFFFF', letterSpacing: '0.02em', lineHeight: 1 }}>
              SIPINTER
            </h1>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, lineHeight: 1.35, color: '#F8FAFC', letterSpacing: '0.01em' }}>
              Sistem Pengendali Kinerja Terintegrasi
            </p>
          </div>
        </div>

        {/* Footer Copyright */}
        <div style={{ position: 'relative', zIndex: 3, fontSize: '12.5px', color: '#94A3B8', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
          © 2026 Balai Pengembangan Kompetensi Pekerjaan Umum Wilayah I Medan.
        </div>
      </div>

      {/* PANEL KANAN: Form Login */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justify: 'center', padding: '60px', minWidth: '420px', background: '#FFFFFF' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          {/* Header Form */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <img src="/2.png" alt="SIPINTER Icon" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
              <span style={{ fontWeight: 800, fontSize: '15px', color: '#07142E', letterSpacing: '0.04em' }}>SIPINTER</span>
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontWeight: 700, fontSize: '26px', color: '#07142E' }}>Selamat datang kembali</h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>Masuk untuk melanjutkan ke dashboard SIPINTER.</p>
          </div>

          {/* Alert Error */}
          {error && (
            <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', fontSize: '13.5px', marginBottom: '20px', fontWeight: 500 }}>
              {error}
            </div>
          )}

          {/* Form Utama */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="email" style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@pu.go.id"
                style={{ height: '50px', borderRadius: '8px', border: '1.5px solid #CBD5E1', padding: '0 16px', fontSize: '15px', color: '#0F172A', background: '#F8FAFC', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="password" style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', height: '50px', borderRadius: '8px', border: '1.5px solid #CBD5E1', padding: '0 44px 0 16px', fontSize: '15px', color: '#0F172A', background: '#F8FAFC', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', padding: 0 }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ height: '50px', border: 'none', borderRadius: '8px', backgroundColor: '#F2A90A', color: '#07142E', fontWeight: 700, fontSize: '16px', cursor: 'pointer', marginTop: '4px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

        </div>
      </div>

    </div>
  )
}