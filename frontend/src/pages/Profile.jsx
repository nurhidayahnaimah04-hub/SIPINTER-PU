import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { storageUrl } from '../lib/helpers'
import { User as UserIcon } from 'lucide-react'

export default function Profile() {
  const { user, updateUser } = useAuth()

  const [name, setName] = useState(user?.name || '')
  const [jabatan, setJabatan] = useState(user?.jabatan || '')
  const [password, setPassword] = useState('')
  const [foto, setFoto] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!foto) {
      setPreviewUrl(null)
      return
    }

    const url = URL.createObjectURL(foto)
    setPreviewUrl(url)

    return () => URL.revokeObjectURL(url)
  }, [foto])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setMsg('')

    try {
      const form = new FormData()

      form.append('name', name)
      form.append('jabatan', jabatan)

      if (password) form.append('password', password)
      if (foto) form.append('foto', foto)

      const res = await api.post('/profile', form)

      updateUser(res.data)

      setMsg('Profil berhasil diperbarui.')
      setPassword('')
      setFoto(null)
    } catch (err) {
      setMsg(err.response?.data?.message || 'Gagal menyimpan perubahan.')
    } finally {
      setSaving(false)
    }
  }

  const currentFotoUrl = user?.foto ? storageUrl(user.foto) : null

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">
        Profil Saya
      </h1>

      <p className="text-sm text-gray-500 mb-6">
        Kelola informasi akun Anda.
      </p>

      {msg && (
        <div className="mb-5 rounded-lg bg-brand-50 text-brand-700 px-4 py-3 text-sm">
          {msg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* CARD KIRI */}
          <div className="card p-6">
            <div className="flex flex-col items-center text-center">

              {previewUrl || currentFotoUrl ? (
                <img
                  src={previewUrl || currentFotoUrl}
                  alt="Foto Profil"
                  className="w-36 h-36 rounded-full object-cover border-4 border-brand-100 shadow"
                />
              ) : (
                <div className="w-36 h-36 rounded-full bg-pupr-yellow text-pupr-blue-dark flex items-center justify-center text-5xl font-bold">
                  {user?.name?.charAt(0) || <UserIcon size={48} />}
                </div>
              )}

              <h2 className="mt-5 text-xl font-semibold text-gray-900">
                {user?.name}
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                {previewUrl
                  ? 'Preview foto baru'
                  : 'Foto profil saat ini'}
              </p>

              <div className="w-full mt-8">
                <label className="label">
                  Ganti Foto Profil
                </label>

                <input
                  type="file"
                  accept="image/*"
                  className="input"
                  onChange={(e) => setFoto(e.target.files[0] || null)}
                />
              </div>

            </div>
          </div>

          {/* CARD KANAN */}
          <div className="card p-6 lg:col-span-2">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>
                <label className="label">
                  NIP
                </label>

                <input
                  className="input bg-gray-50"
                  value={user?.nip || '-'}
                  disabled
                />
              </div>

              <div>
                <label className="label">
                  Email
                </label>

                <input
                  className="input bg-gray-50"
                  value={user?.email || ''}
                  disabled
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">
                  Nama Lengkap
                </label>

                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">
                  Jabatan
                </label>

                <input
                  className="input"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">
                  Password Baru
                </label>

                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak ingin mengubah password"
                />
              </div>

            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                className="btn bg-pupr-blue-dark hover:bg-pupr-blue text-white transition-colors disabled:opacity-60 px-8"
                disabled={saving}
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>

          </div>

        </div>
      </form>
    </div>
  )
}