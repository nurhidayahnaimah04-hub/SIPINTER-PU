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
    <>
      {/* Pengaturan CSS Responsif agar Tetap Split-Screen Sempurna di HP */}
      <style>{`
        .login-main-container {
          width: 100vw;
          min-height: 100vh;
          display: flex;
          background: #FFFFFF;
          overflow-x: hidden;
        }

        .panel-left-wrapper {
          flex: 1.1;
          background: #07142E;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 60px 50px;
          border-right: 6px solid #F2A90A;
          position: relative;
          overflow: hidden;
        }

        .panel-right-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 50px;
          background: #FFFFFF;
        }

        .text-sipinter-title {
          font-size: 64px;
        }

        .text-sipinter-sub {
          font-size: 22px;
        }

        .logo-bapekom-box {
          width: 56px;
          height: 56px;
        }

        .logo-sipinter-img {
          width: 105px;
          height: 105px;
        }

        /* PERPENYESUAIAN SKALA KHUSUS LAYAR HP (TETAP DUA PANEL KIRI-KANAN) */
        @media (max-width: 768px) {
          .panel-left-wrapper {
            padding: 24px 16px !important;
            border-right-width: 4px !important;
          }

          .panel-right-wrapper {
            padding: 24px 16px !important;
          }

          .text-sipinter-title {
            font-size: 28px !important;
          }

          .text-sipinter-sub {
            font-size: 11px !important;
          }

          .header-instansi-title {
            font-size: 10px !important;
            white-space: normal !important;
          }

          .header-instansi-sub {
            font-size: 8px !important;
          }

          .logo-bapekom-box {
            width: 32px !important;
            height: 32px !important;
          }

          .logo-sipinter-img {
            width: 42px !important;
            height: 42px !important;
          }

          .branding-gap {
            gap: 10px !important;
          }

          .form-title-mobile {
            font-size: 20px !important;
          }

          .form-desc-mobile {
            font-size: 12px !important;
          }

          .form-input-mobile {
            height: 44px !important;
            font-size: 13px !important;
          }
        }
      `}</style>

      <div className="login-main-container">

        {/* PANEL KIRI: Identitas Instansi & Branding */}
        <div className="panel-left-wrapper">

          {/* Foto Gedung Background */}
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', bottom: '-10px', left: '-10px', backgroundImage: 'url(/gedung.jpeg)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 70, filter: 'grayscale(100%) blur(2px)', pointerEvents: 'none', zIndex: 1 }} />

          {/* Gradient Darkener */}
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: 'linear-gradient(180deg, rgba(7, 20, 46, 0.88) 0%, rgba(7, 20, 46, 0.96) 100%)', pointerEvents: 'none', zIndex: 2 }} />

          {/* Header Balai */}
          <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="logo-bapekom-box" style={{ borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0, overflow: 'hidden', padding: '2px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
              <img src="/logo-bapekom.jpg" alt="Logo Bapekom I Medan" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
            </div>
            <div>
              <div className="header-instansi-sub" style={{ color: '#F2A90A', fontWeight: 700, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px', lineHeight: 1.1 }}>
                Kementerian Pekerjaan Umum
              </div>
              <div className="header-instansi-title" style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '15px', lineHeight: 1.25 }}>
                Balai Pengembangan Kompetensi PU Wilayah I Medan
              </div>
            </div>
          </div>

          {/* Branding Utama SIPINTER */}
          <div className="branding-gap" style={{ position: 'relative', zIndex: 3, maxWidth: '580px', margin: 'auto 0', display: 'flex', alignItems: 'center', gap: '28px' }}>
            <div className="logo-sipinter-img" style={{ display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0, filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }}>
              <img src="/logo-sipinter.png" alt="Logo SIPINTER" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1 className="text-sipinter-title" style={{ margin: '0 0 4px 0', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.02em', lineHeight: 1 }}>
                SIPINTER
              </h1>
              <p className="text-sipinter-sub" style={{ margin: 0, fontWeight: 600, lineHeight: 1.2, color: '#F2A90A', letterSpacing: '0.01em' }}>
                Sistem Pengendali Kinerja Terintegrasi
              </p>
            </div>
          </div>

          {/* Footer Copyright */}
          <div style={{ position: 'relative', zIndex: 3, fontSize: '11px', color: '#94A3B8', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '16px' }}>
            © 2026 Bapekom PU Wilayah I Medan.
          </div>
        </div>

        {/* PANEL KANAN: Form Login Rata Tengah */}
        <div className="panel-right-wrapper">
          <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* Header Form */}
            <div style={{ marginBottom: '28px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
                <img src="/logo-sipinter.png" alt="SIPINTER Icon" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                <span style={{ fontWeight: 800, fontSize: '15px', color: '#07142E', letterSpacing: '0.05em' }}>SIPINTER</span>
              </div>
              <h2 className="form-title-mobile" style={{ margin: '0 0 8px 0', fontWeight: 800, fontSize: '30px', color: '#07142E', letterSpacing: '-0.01em' }}>Selamat datang</h2>
              <p className="form-desc-mobile" style={{ margin: 0, fontSize: '15px', color: '#64748B', lineHeight: 1.4 }}>Masuk untuk melanjutkan ke dashboard SIPINTER.</p>
            </div>

            {/* Alert Error */}
            {error && (
              <div style={{ width: '100%', padding: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', fontSize: '13px', marginBottom: '20px', fontWeight: 500, textAlign: 'center' }}>
                {error}
              </div>
            )}

            {/* Form Utama */}
            <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                <label htmlFor="email" style={{ fontSize: '13.5px', fontWeight: 700, color: '#1E293B' }}>Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@pu.go.id"
                  className="form-input-mobile"
                  style={{ height: '52px', borderRadius: '10px', border: '1.5px solid #CBD5E1', padding: '0 14px', fontSize: '15px', color: '#0F172A', background: '#F8FAFC', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                <label htmlFor="password" style={{ fontSize: '13.5px', fontWeight: 700, color: '#1E293B' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="form-input-mobile"
                    style={{ width: '100%', height: '52px', borderRadius: '10px', border: '1.5px solid #CBD5E1', padding: '0 42px 0 14px', fontSize: '15px', color: '#0F172A', background: '#F8FAFC', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', padding: 0 }}
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
                className="form-input-mobile"
                style={{ height: '52px', border: 'none', borderRadius: '10px', backgroundColor: '#F2A90A', color: '#07142E', fontWeight: 800, fontSize: '16px', cursor: 'pointer', marginTop: '4px', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 12px rgba(242, 169, 10, 0.25)' }}
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>

          </div>
        </div>

      </div>
    </>
  )
}