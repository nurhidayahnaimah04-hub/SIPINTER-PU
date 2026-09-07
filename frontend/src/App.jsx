import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/auth/Login'

import KabalaiDashboard from './pages/kabalai/Dashboard'
import KabalaiTugas from './pages/kabalai/Tugas'
import KabalaiTugasDetail from './pages/kabalai/TugasDetail'
import KabalaiTeams from './pages/kabalai/Teams'
import KabalaiUsers from './pages/kabalai/UserManagement'
import KabalaiNotifications from './pages/kabalai/Notifications'

import KasubagDashboard from './pages/kasubag/Dashboard'
import KasubagTugas from './pages/kasubag/Tugas'
import KasubagTugasDetail from './pages/kasubag/TugasDetail'
import KasubagVerifikasi from './pages/kasubag/Verifikasi'
import KasubagTeams from './pages/kasubag/Teams'
import KasubagUsers from './pages/kasubag/UserManagement'
import KasubagNotifications from './pages/kasubag/Notifications'

import KatimDashboard from './pages/katim/Dashboard'
import KatimTugas from './pages/katim/Tugas'
import KatimTugasDetail from './pages/katim/TugasDetail'
import KatimVerifikasi from './pages/katim/Verifikasi'
import KatimTeam from './pages/katim/MyTeam'
import KatimNotifications from './pages/katim/Notifications'

import AnggotaDashboard from './pages/anggota/Dashboard'
import AnggotaSubtugas from './pages/anggota/Subtugas'
import AnggotaSubtugasDetail from './pages/anggota/SubtugasDetail'
import AnggotaHistory from './pages/anggota/History'
import AnggotaNotifications from './pages/anggota/Notifications'

import Profile from './pages/Profile'
import DashboardLayout from './layouts/DashboardLayout'

function Protected({ roles, children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Memuat...</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />
  return <DashboardLayout>{children}</DashboardLayout>
}

export default function App() {
  const { user, loading } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={`/${user.role}`} replace /> : <Login />} />

      {/* Kabalai */}
      <Route path="/kabalai" element={<Protected roles={['kabalai']}><KabalaiDashboard /></Protected>} />
      <Route path="/kabalai/tugas" element={<Protected roles={['kabalai']}><KabalaiTugas /></Protected>} />
      <Route path="/kabalai/tugas/:id" element={<Protected roles={['kabalai']}><KabalaiTugasDetail /></Protected>} />
      <Route path="/kabalai/teams" element={<Protected roles={['kabalai']}><KabalaiTeams /></Protected>} />
      <Route path="/kabalai/users" element={<Protected roles={['kabalai']}><KabalaiUsers /></Protected>} />
      <Route path="/kabalai/notifications" element={<Protected roles={['kabalai']}><KabalaiNotifications /></Protected>} />
      <Route path="/kabalai/profile" element={<Protected roles={['kabalai']}><Profile /></Protected>} />

      {/* Kasubag */}
      <Route path="/kasubag" element={<Protected roles={['kasubag']}><KasubagDashboard /></Protected>} />
      <Route path="/kasubag/tugas" element={<Protected roles={['kasubag']}><KasubagTugas /></Protected>} />
      <Route path="/kasubag/tugas/:id" element={<Protected roles={['kasubag']}><KasubagTugasDetail /></Protected>} />
      <Route path="/kasubag/verifikasi" element={<Protected roles={['kasubag']}><KasubagVerifikasi /></Protected>} />
      <Route path="/kasubag/teams" element={<Protected roles={['kasubag']}><KasubagTeams /></Protected>} />
      <Route path="/kasubag/users" element={<Protected roles={['kasubag']}><KasubagUsers /></Protected>} />
      <Route path="/kasubag/notifications" element={<Protected roles={['kasubag']}><KasubagNotifications /></Protected>} />
      <Route path="/kasubag/profile" element={<Protected roles={['kasubag']}><Profile /></Protected>} />

      {/* Katim */}
      <Route path="/katim" element={<Protected roles={['katim']}><KatimDashboard /></Protected>} />
      <Route path="/katim/tugas" element={<Protected roles={['katim']}><KatimTugas /></Protected>} />
      <Route path="/katim/tugas/:id" element={<Protected roles={['katim']}><KatimTugasDetail /></Protected>} />
      <Route path="/katim/verifikasi" element={<Protected roles={['katim']}><KatimVerifikasi /></Protected>} />
      <Route path="/katim/team" element={<Protected roles={['katim']}><KatimTeam /></Protected>} />
      <Route path="/katim/notifications" element={<Protected roles={['katim']}><KatimNotifications /></Protected>} />
      <Route path="/katim/profile" element={<Protected roles={['katim']}><Profile /></Protected>} />

      {/* Anggota */}
      <Route path="/anggota" element={<Protected roles={['anggota']}><AnggotaDashboard /></Protected>} />
      <Route path="/anggota/subtugas" element={<Protected roles={['anggota']}><AnggotaSubtugas /></Protected>} />
      <Route path="/anggota/subtugas/:id" element={<Protected roles={['anggota']}><AnggotaSubtugasDetail /></Protected>} />
      <Route path="/anggota/history" element={<Protected roles={['anggota']}><AnggotaHistory /></Protected>} />
      <Route path="/anggota/notifications" element={<Protected roles={['anggota']}><AnggotaNotifications /></Protected>} />
      <Route path="/anggota/profile" element={<Protected roles={['anggota']}><Profile /></Protected>} />

      <Route path="/" element={loading ? null : user ? <Navigate to={`/${user.role}`} replace /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
