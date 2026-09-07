import { useAuth } from '../context/AuthContext.jsx'

const roleLabel = {
  kepala_balai: 'Kepala Balai',
  ketua_tim: 'Ketua Tim',
  anggota: 'Anggota',
}

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="bg-pupr-blue relative shadow-md">
      <div className="absolute bottom-0 left-0 w-full h-1 bg-pupr-yellow" />
      <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
        <div>
          <div className="font-bold text-white tracking-tight">Progress Tugas Balai</div>
          <div className="text-xs text-blue-200">
            Balai Pengembangan Kompetensi PU Wilayah I Medan
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <div className="font-medium text-white">{user?.name}</div>
            <div className="text-pupr-yellow text-xs font-medium">{roleLabel[user?.role]}</div>
          </div>
          <button
            onClick={logout}
            className="bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-1.5 rounded-lg transition border border-white/10"
          >
            Keluar
          </button>
        </div>
      </div>
    </nav>
  )
}
