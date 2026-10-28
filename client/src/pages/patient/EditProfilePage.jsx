import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  X, Camera,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '../../hooks/usePageTitle'
import { readAvatarFile } from '../../lib/avatarUpload'

import AvatarDisplay, { ANIMAL_ICONS } from '../../components/AvatarDisplay'
import { useToast } from '../../context/ToastContext'

export default function EditProfilePage() {
  const { showError } = useToast()
  usePageTitle('Editar Perfil')
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  const [editName, setEditName] = useState(user?.name || '')
  const [editEmail, setEditEmail] = useState(user?.email || '')
  const [editPassword, setEditPassword] = useState('')
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const fileInputRef = useRef(null)

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    try {
      await updateUser({
        name: editName,
        email: editEmail !== user?.email ? editEmail : undefined,
        password: editPassword || undefined,
        avatar: editAvatar || null,
      })
      navigate('/patient/profile')
    } catch (err) {
      showError(err.response?.data?.error || err.message || 'Error al guardar perfil')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setAvatarError('')
    try {
      setEditAvatar(await readAvatarFile(file))
    } catch (err) {
      setAvatarError(err.message)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Editar Perfil</h1>
        <button onClick={() => navigate('/patient/profile')} className="text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
      </div>

      <div className="card space-y-4">
        {/* Selector de Avatar */}
        <div className="space-y-4">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Foto de Perfil</label>
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 bg-sage-50 dark:bg-sage-900/30 rounded-full flex items-center justify-center overflow-hidden border-2 border-sage-200 dark:border-sage-800">
              <AvatarDisplay avatar={editAvatar} size={48} className="text-sage-500" />
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
                aria-describedby={avatarError ? 'avatar-upload-error' : undefined}
              />
              <button onClick={() => fileInputRef.current?.click()} className="btn-ghost text-xs py-2 px-4 flex items-center gap-1.5">
                <Camera size={16} /> Subir foto
              </button>
              <button onClick={() => setEditAvatar('')} className="btn-ghost text-xs py-2 px-4 text-red-500 hover:text-red-600">
                Eliminar
              </button>
            </div>
          </div>
          {avatarError && (
            <p id="avatar-upload-error" role="alert" className="text-center text-sm text-red-600 dark:text-red-400">
              {avatarError}
            </p>
          )}
          
          <p className="text-sm font-semibold text-center text-gray-500 dark:text-gray-400 mt-4">O elige un animalito:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {Object.keys(ANIMAL_ICONS).map(name => {
              const AnimalIcon = ANIMAL_ICONS[name]
              const isActive = editAvatar === `icon:${name}`
              return (
                <button
                  key={name}
                  onClick={() => setEditAvatar(`icon:${name}`)}
                  className={`p-3 rounded-2xl transition-all ${
                    isActive ? 'bg-sage-400 text-white shadow-md scale-110' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <AnimalIcon size={32} />
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-peach-100 dark:border-gray-700 mt-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nombre</label>
            <input className="input" value={editName} onChange={e => setEditName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Email</label>
            <input className="input" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nueva Contraseña (opcional)</label>
            <input className="input" type="password" placeholder="Dejar en blanco para no cambiar" value={editPassword} onChange={e => setEditPassword(e.target.value)} />
          </div>
        </div>

        <button onClick={handleSaveProfile} disabled={profileSaving || !editName || !editEmail} className="btn-patient w-full mt-6 py-4 text-base">
          {profileSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  )
}
