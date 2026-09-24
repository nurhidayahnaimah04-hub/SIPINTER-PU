import { useAuth } from '../../context/AuthContext'
import TugasListView from '../../components/TugasListView'

export default function Tugas() {
  const { user } = useAuth()
  
  // Menyesuaikan basePath secara dinamis sesuai role yang sedang login (/katim/tugas atau /anggota/tugas)
  const basePath = `/${user?.role}/tugas`

  return (
    <TugasListView 
      basePath={basePath} 
      canCreate={true} 
      title="Daftar Tugas" 
      subtitle="Kelola dan pantau tugas utama pada tim Anda." 
    />
  )
}