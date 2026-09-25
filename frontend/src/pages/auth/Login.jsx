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
      {/* CSS khusus untuk penyesuaian layar HP & iPad */}
      <style>{`
        .login-main-container {
          width: 100vw;
          min-height: 100vh;
          display: flex;
          background: #FFFFFF;
        }

        .panel-left-wrapper {
          flex: 1.3;
          background: #0A3D7A;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 60px 72px;
          min-width: 540px;
          border-right: 6px solid #F2A90A;
          position: relative;
          overflow: hidden;
        }

        .panel-right-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 80px;
          min-width: 460px;
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

        /* --- PENYESUAIAN HANYA UNTUK HP DAN IPAD / TABLET (< 1024px) --- */
        @media (max-width: 1024px) {
          .login-main-container {
            flex-direction: column !important; /* Di HP & iPad berubah jadi Atas-Bawah */
            min-height: 100vh;
          }

          .panel-left-wrapper {
            flex: initial !important;
            min-width: 100% !important;
            padding: 32px 24px !important;
            border-right: none !important;
            border-bottom: 5px solid #F2A90A !important; /* Garis kuning pindah ke bawah banner */
            gap: 24px !important;
          }

          .panel-right-wrapper {
            flex: 1 !important;
            min-width: 100% !important;
            padding: 36px 24px 40px 24px !important;
          }

          .header-balai-box {
            gap: 14px !important;
          }

          .logo-bapekom-box {
            width: 44px !important;
            height: 44px !important;
          }

          .header-instansi-sub {
            font-size: 10px !important;
          }

          .header-instansi-title {
            font-size: 13px !important;
            white-space: normal !important; /* Agar teks Bapekom tidak terpotong di HP */
          }

          .branding-gap {
            gap: 16px !important;
            margin: 10px 0 !important;
          }

          .logo-sipinter-img {
            width: 56px !important;
            height: 56px !important;
          }

          .text-sipinter-title {
            font-size: 34px !important;
          }

          .text-sipinter-sub {
            font-size: 14px !important;
          }

          .footer-copyright {
            display: none !important; /* Ringkas footer banner atas di HP */
          }

          .form-title-mobile {
            font-size: 24px !important;
          }

          .form-desc-mobile {
            font-size: 13.5px !important;
          }
        }
      `}</style>

      <div className="login-main-container">

        {/* PANEL BRANDING (Kiri di Laptop / Atas di HP & iPad) */}
        <div className="panel-left-wrapper">

          {/* Foto Gedung Background */}
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', bottom: '-10px', left: '-10px', backgroundImage: 'url(/gedung.jpeg)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 60, filter: 'grayscale(100%) blur(2px)', pointerEvents: 'none', zIndex: 1 }} />

          {/* Gradient Darkener */}
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: 'linear-gradient(180deg, rgba(7, 20, 46, 0.88) 0%, rgba(7, 20, 46, 0.96) 100%)', pointerEvents: 'none', zIndex: 2 }} />

          {/* Header Balai */}
          <div className="header-balai-box" style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div className="logo-bapekom-box" style={{ borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0, overflow: 'hidden', padding: '2px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
              <img src="/logo-bapekom.jpg" alt="Logo Bapekom I Medan" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
            </div>
            <div>
              <div className="header-instansi-sub" style={{ color: '#F2A90A', fontWeight: 700, fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px', lineHeight: 1 }}>
                Kementerian Pekerjaan Umum
              </div>
              <div className="header-instansi-title" style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '15px', lineHeight: 1.35, whiteSpace: 'nowrap' }}>
                Balai Pengembangan Kompetensi Pekerjaan Umum Wilayah I Medan
              </div>
            </div>
          </div>

          {/* Branding Utama SIPINTER */}
          <div className="branding-gap" style={{ position: 'relative', zIndex: 3, maxWidth: '580px', margin: 'auto 0', display: 'flex', alignItems: 'center', gap: '28px' }}>
            <div className="logo-sipinter-img" style={{ display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0, filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }}>
              <img src="/logo-sipinter.png" alt="Logo SIPINTER" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1 className="text-sipinter-title" style={{ margin: '0 0 6px 0', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.02em', lineHeight: 1 }}>
                SIPINTER
              </h1>
              <p className="text-sipinter-sub" style={{ margin: 0, fontWeight: 600, lineHeight: 1.3, color: '#F2A90A', letterSpacing: '0.01em' }}>
                Sistem Pengendali Kinerja Terintegrasi
              </p>
            </div>
          </div>

          {/* Footer Copyright */}
          <div className="footer-copyright" style={{ position: 'relative', zIndex: 3, fontSize: '13px', color: '#94A3B8', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '22px' }}>
            © 2026 Balai Pengembangan Kompetensi Pekerjaan Umum Wilayah I Medan.
          </div>
        </div>

        {/* PANEL FORM LOGIN (Kanan di Laptop / Bawah di HP & iPad) */}
        <div className="panel-right-wrapper">
          <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* Header Form */}
            <div style={{ marginBottom: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
                <img src="/logo-sipinter.png" alt="SIPINTER Icon" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                <span style={{ fontWeight: 800, fontSize: '16px', color: '#0A3D7A', letterSpacing: '0.05em' }}>SIPINTER</span>
              </div>
              <h2 className="form-title-mobile" style={{ margin: '0 0 10px 0', fontWeight: 800, fontSize: '30px', color: '#07142E', letterSpacing: '-0.01em' }}>Selamat datang</h2>
              <p className="form-desc-mobile" style={{ margin: 0, fontSize: '15px', color: '#64748B', lineHeight: 1.5 }}>Masuk untuk melanjutkan ke dashboard SIPINTER.</p>
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
                <label htmlFor="email" style={{ fontSize: '14.5px', fontWeight: 700, color: '#0A3D7A' }}>Email</label>
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
                <label htmlFor="password" style={{ fontSize: '14.5px', fontWeight: 700, color: '#0A3D7A' }}>Password</label>
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
                style={{ height: '52px', border: 'none', borderRadius: '10px', backgroundColor: '#F2A90A', color: '#000000ff', fontWeight: 800, fontSize: '16.5px', cursor: 'pointer', marginTop: '6px', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 12px rgba(242, 169, 10, 0.25)' }}
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>

            <div style={{ marginTop: '28px', fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>
              © 2026 Balai Pengembangan Kompetensi Pekerjaan Umum Wilayah I Medan.
            </div>

          </div>
        </div>

      </div>
    </>
  )
}