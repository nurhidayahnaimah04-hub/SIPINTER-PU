import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Login from './pages/Login.jsx'
import KepalaBalaiDashboard from './pages/KepalaBalaiDashboard.jsx'
import KetuaTimDashboard from './pages/KetuaTimDashboard.jsx'
import AnggotaDashboard from './pages/AnggotaDashboard.jsx'

function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="p-8 text-center">Memuat...</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />

  return children
}

function RoleRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8 text-center">Memuat...</div>
  if (!user) return <Navigate to="/login" replace />

  if (user.role === 'kepala_balai') return <Navigate to="/kepala-balai" replace />
  if (user.role === 'ketua_tim') return <Navigate to="/ketua-tim" replace />
  return <Navigate to="/anggota" replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RoleRedirect />} />
      <Route
        path="/kepala-balai"
        element={
          <ProtectedRoute roles={['kepala_balai']}>
            <KepalaBalaiDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ketua-tim"
        element={
          <ProtectedRoute roles={['ketua_tim']}>
            <KetuaTimDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/anggota"
        element={
          <ProtectedRoute roles={['anggota']}>
            <AnggotaDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
