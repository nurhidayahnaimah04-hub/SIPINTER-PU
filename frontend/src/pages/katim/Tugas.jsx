import TugasListView from '../../components/TugasListView'
export default function Tugas() {
  return <TugasListView basePath="/katim/tugas" canCreate={false} title="Tugas dari Kasubag" subtitle="Tugas untuk tim Anda. Pecah menjadi subtugas untuk anggota." />
}
