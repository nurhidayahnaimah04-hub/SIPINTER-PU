  import { NavLink, useNavigate, useLocation ,Link } from 'react-router-dom'
  import { useAuth } from '../context/AuthContext'
  import { useEffect, useState } from 'react'
  import api from '../lib/api'
  import PeriodeSelector from '../components/PeriodeSelector'
  import { storageUrl } from '../lib/helpers'
  import { onNotificationsChanged } from '../lib/notificationBus'
  import {
    LayoutDashboard, ClipboardList, Users, UserCog, Bell,
    User, LogOut, CheckSquare, History, Building2, Menu, X, Eye,
  } from 'lucide-react'
  import { useNotificationStream } from '../lib/notificationStream'

  const NAV = {
    kabalai: [
      { to: '/kabalai', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/kabalai/tugas', label: 'Pantau Tugas', icon: Eye },
      { to: '/kabalai/teams', label: 'Manajemen Tim', icon: Building2 },
      { to: '/kabalai/users', label: 'Manajemen User', icon: UserCog },
      { to: '/kabalai/notifications', label: 'Notifikasi', icon: Bell },
    ],
    kasubag: [
      { to: '/kasubag', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/kasubag/tugas', label: 'Daftar Tugas', icon: ClipboardList },
      { to: '/kasubag/verifikasi', label: 'Verifikasi', icon: CheckSquare },
      { to: '/kasubag/teams', label: 'Manajemen Tim', icon: Building2 },
      { to: '/kasubag/users', label: 'Manajemen User', icon: UserCog },
      { to: '/kasubag/notifications', label: 'Notifikasi', icon: Bell },
    ],
    katim: [
      { to: '/katim', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/katim/tugas', label: 'Tugas dari Kasubag', icon: ClipboardList },
      { to: '/katim/verifikasi', label: 'Verifikasi Subtugas', icon: CheckSquare },
      { to: '/katim/team', label: 'Tim Saya', icon: Users },
      { to: '/katim/notifications', label: 'Notifikasi', icon: Bell },
    ],
    anggota: [
      { to: '/anggota', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/anggota/subtugas', label: 'Subtugas Saya', icon: ClipboardList },
      { to: '/anggota/history', label: 'Riwayat', icon: History },
      { to: '/anggota/notifications', label: 'Notifikasi', icon: Bell },
    ],
  }

  const ROLE_LABEL = { kabalai: 'Kabalai', kasubag: 'Kasubag', katim: 'Kepala Tim', anggota: 'Anggota Tim' }
  const SHOW_PERIODE = ['kabalai', 'kasubag', 'katim', 'anggota']

  export default function DashboardLayout({ children }) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [unread, setUnread] = useState(0)
    const [mobileOpen, setMobileOpen] = useState(false)
    const items = NAV[user?.role] || []
    const location = useLocation()   // <-- ini yang kelewat
    const fotoUrl = user?.foto ? storageUrl(user.foto) : null

    function loadUnread() {
      api.get('/notifications/unread-count').then((res) => setUnread(res.data.count)).catch(() => {})
    }


    useEffect(() => {
      loadUnread()
      const interval = setInterval(loadUnread, 30000)   // 30 detik, jaring pengaman aja
      return () => clearInterval(interval)
    }, [])

    // Sinkron ulang ke angka asli dari server: (a) tiap ada aksi baca notifikasi
    // di halaman manapun, (b) tiap pindah halaman -- supaya badge tidak "nyangkut".
    useEffect(() => onNotificationsChanged(loadUnread), [])
    useEffect(() => { loadUnread() }, [location.pathname])

    // Kenaikan instan begitu ada notif baru masuk lewat SSE.
    useNotificationStream(() => {
      setUnread((prev) => prev + 1)
    })

    async function handleLogout() {
      await logout()
      navigate('/login')
    }

    return (
      <div className="min-h-screen flex">
        <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-pupr-blue text-white flex flex-col transform transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="h-16 px-6 border-b border-white/10 flex items-center gap-3 flex-shrink-0">
            <img src="/logo-pu.jpg" alt="Logo Kementerian PU" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">SIPINTER</p>
              <p className="text-[11px] text-pupr-yellow leading-tight truncate">Bapekom PU Wilayah I</p>
            </div>
          </div>
          <nav className="flex-1 px-4 py-5 space-y-2 overflow-y-auto">
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to} to={to} end={end} onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-pupr-yellow text-pupr-blue-dark' : 'text-white/80 hover:bg-white/10'}`}
              >
                <Icon size={18} />
                {label}
                {label === 'Notifikasi' && unread > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{unread}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="px-4 py-5 border-t border-white/10 space-y-2 flex-shrink-0">
            <NavLink
              to={`/${user?.role}/profile`}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-pupr-yellow text-pupr-blue-dark' : 'text-white/80 hover:bg-white/10'}`}
            >
              <User size={18} /> Profil
            </NavLink>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10">
              <LogOut size={18} /> Keluar
            </button>
          </div>
        </aside>

        {mobileOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />}

        <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
          <header className="h-16 bg-white border-b border-gray-200 px-6 lg:px-10 flex items-center justify-between sticky top-0 z-10 gap-4">
            <button className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu size={22} /></button>
            <div className="hidden lg:flex items-center">
              {SHOW_PERIODE.includes(user?.role) && <PeriodeSelector />}
            </div>
            <Link
              to={`/${user?.role}/profile`}
              className="flex items-center gap-4 rounded-lg px-2 py-1 -mx-2 hover:bg-gray-50 transition-colors"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{ROLE_LABEL[user?.role]} {user?.jabatan ? `· ${user.jabatan}` : ''}</p>
              </div>
              {fotoUrl ? (
                <img src={fotoUrl} alt={user?.name} className="w-9 h-9 rounded-full object-cover border border-gray-200 flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-pupr-yellow text-pupr-blue-dark flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {user?.name?.charAt(0)}
                </div>
              )}
            </Link>
          </header>
          <div className="lg:hidden px-6 pt-4">
            {SHOW_PERIODE.includes(user?.role) && <PeriodeSelector />}
          </div>
          <main className="flex-1 p-6 lg:p-10">{children}</main>
        </div>
      </div>
    )
  } 