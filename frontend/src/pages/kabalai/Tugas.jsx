import TugasListView from '../../components/TugasListView'
export default function Tugas() {
  return <TugasListView basePath="/kabalai/tugas" canCreate={false} groupByTeam={true} title="Pantau Tugas" subtitle="Lihat progres seluruh tugas & subtugas semua tim, beri catatan bila perlu." />
}
