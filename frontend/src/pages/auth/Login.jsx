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
    <div style={{ width: '100vw', minHeight: '100vh', display: 'flex', background: '#FFFFFF' }}>

      {/* PANEL KIRI: Identitas Instansi & Branding (Lebih Terstruktur) */}
      <div style={{ flex: '1.3', background: '#07142E', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '60px 72px', minWidth: '540px', borderRight: '6px solid #F2A90A', position: 'relative', overflow: 'hidden' }}>

        {/* Foto Gedung Background (Opacity 0.25) */}
        <div style={{ position: 'absolute', top: '-10px', right: '-10px', bottom: '-10px', left: '-10px', backgroundImage: 'url(/gedung.jpeg)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 70, filter: 'grayscale(100%) blur(2px)', pointerEvents: 'none', zIndex: 1 }} />

        {/* Gradient Darkener */}
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: 'linear-gradient(180deg, rgba(7, 20, 46, 0.88) 0%, rgba(7, 20, 46, 0.96) 100%)', pointerEvents: 'none', zIndex: 2 }} />

        {/* Header Balai */}
        <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0, overflow: 'hidden', padding: '2px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
            <img src="/logo-bapekom.jpg" alt="Logo Bapekom I Medan" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
          </div>
          <div>
            <div style={{ color: '#F2A90A', fontWeight: 700, fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px', lineHeight: 1 }}>
              Kementerian Pekerjaan Umum
            </div>
            <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '15px', lineHeight: 1.35, whiteSpace: 'nowrap' }}>
              Balai Pengembangan Kompetensi Pekerjaan Umum Wilayah I Medan
            </div>
          </div>
        </div>

        {/* Branding Utama SIPINTER */}
        <div style={{ position: 'relative', zIndex: 3, maxWidth: '580px', margin: 'auto 0', display: 'flex', alignItems: 'center', gap: '28px' }}>
          <div style={{ width: '105px', height: '105px', display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0, filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }}>
            <img src="/logo-sipinter.png" alt="Logo SIPINTER" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ margin: '0 0 6px 0', fontWeight: 800, fontSize: '64px', color: '#FFFFFF', letterSpacing: '0.02em', lineHeight: 1 }}>
              SIPINTER
            </h1>
            <p style={{ margin: 0, fontSize: '22px', fontWeight: 600, lineHeight: 1.3, color: '#F2A90A', letterSpacing: '0.01em' }}>
              Sistem Pengendali Kinerja Terintegrasi
            </p>
          </div>
        </div>

        {/* Footer Copyright */}
        <div style={{ position: 'relative', zIndex: 3, fontSize: '13px', color: '#94A3B8', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '22px' }}>
          © 2026 Balai Pengembangan Kompetensi Pekerjaan Umum Wilayah I Medan.
        </div>
      </div>

      {/* PANEL KANAN: Form Login (Hanya Diubah Rata Tengah) */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justify: 'center', padding: '60px 80px', minWidth: '460px', background: '#FFFFFF' }}>
        <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Header Form (Rata Tengah) */}
          <div style={{ marginBottom: '36px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
              <img src="/logo-sipinter.png" alt="SIPINTER Icon" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
              <span style={{ fontWeight: 800, fontSize: '16px', color: '#07142E', letterSpacing: '0.05em' }}>SIPINTER</span>
            </div>
            <h2 style={{ margin: '0 0 10px 0', fontWeight: 800, fontSize: '30px', color: '#07142E', letterSpacing: '-0.01em' }}>Selamat datang</h2>
            <p style={{ margin: 0, fontSize: '15px', color: '#64748B', lineHeight: 1.5 }}>Masuk untuk melanjutkan ke dashboard SIPINTER.</p>
          </div>

          {/* Alert Error */}
          {error && (
            <div style={{ width: '100%', padding: '14px 18px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', color: '#991B1B', fontSize: '14px', marginBottom: '24px', fontWeight: 500, textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* Form Utama */}
          <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', textAlign: 'left' }}>
              <label htmlFor="email" style={{ fontSize: '14.5px', fontWeight: 700, color: '#1E293B' }}>Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@pu.go.id"
                style={{ height: '52px', borderRadius: '10px', border: '1.5px solid #CBD5E1', padding: '0 18px', fontSize: '15.5px', color: '#0F172A', background: '#F8FAFC', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', textAlign: 'left' }}>
              <label htmlFor="password" style={{ fontSize: '14.5px', fontWeight: 700, color: '#1E293B' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', height: '52px', borderRadius: '10px', border: '1.5px solid #CBD5E1', padding: '0 48px 0 18px', fontSize: '15.5px', color: '#0F172A', background: '#F8FAFC', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', padding: 0 }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ height: '52px', border: 'none', borderRadius: '10px', backgroundColor: '#F2A90A', color: '#07142E', fontWeight: 800, fontSize: '16.5px', cursor: 'pointer', marginTop: '6px', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 12px rgba(242, 169, 10, 0.25)' }}
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

        </div>
      </div>

    </div>
  )
}