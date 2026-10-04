import { useState, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Moon, Sun, User, Camera, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export function AvatarDisplay({ avatar, size = 28, className = "" }) {
  if (!avatar) return <User size={size} className={className} />
  if (avatar.startsWith('data:image')) {
    return <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
  }
  return <User size={size} className={className} />
}

export default function PsychSettings() {
  const { darkMode, setDarkMode } = useOutletContext()
  const { user, updateUser, logout } = useAuth()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(user?.name || '')
  const [editEmail, setEditEmail] = useState(user?.email || '')
  const [editPassword, setEditPassword] = useState('')
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '')
  const [profileSaving, setProfileSaving] = useState(false)
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
      setIsEditing(false)
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Error al guardar perfil')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setEditAvatar(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const cancelEdit = () => {
    setEditName(user?.name || '')
    setEditEmail(user?.email || '')
    setEditPassword('')
    setEditAvatar(user?.avatar || '')
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Administrá tus preferencias y ajustes de la cuenta.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Apariencia */}
        <div className="bg-white dark:bg-[var(--theme-surface)] rounded-2xl shadow-sm border border-gray-100 dark:border-[var(--theme-border)] overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-[var(--theme-border)]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Apariencia</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Modo Oscuro</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cambiar entre tema claro y oscuro</p>
                </div>
              </div>
              <button
                onClick={() => setDarkMode(d => !d)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  darkMode ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Perfil Profesional */}
        <div className="bg-white dark:bg-[var(--theme-surface)] rounded-2xl shadow-sm border border-gray-100 dark:border-[var(--theme-border)] overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-[var(--theme-border)] flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Perfil Profesional</h2>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                Editar Perfil
              </button>
            )}
          </div>
          
          <div className="p-6">
            {isEditing ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center overflow-hidden border-2 border-indigo-100 dark:border-indigo-900">
                    <AvatarDisplay avatar={editAvatar} size={48} className="text-gray-400" />
                  </div>
                  <div className="flex gap-2">
                    <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                    <button onClick={() => fileInputRef.current?.click()} className="text-sm py-1.5 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                      <Camera size={16} /> Subir foto
                    </button>
                    <button onClick={() => setEditAvatar('')} className="text-sm py-1.5 px-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium">
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre y Apellido</label>
                    <input 
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input 
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" 
                      type="email" 
                      value={editEmail} 
                      onChange={e => setEditEmail(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nueva Contraseña (opcional)</label>
                    <input 
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" 
                      type="password" 
                      placeholder="Dejar en blanco para no cambiar" 
                      value={editPassword} 
                      onChange={e => setEditPassword(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button 
                    onClick={cancelEdit}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveProfile} 
                    disabled={profileSaving || !editName || !editEmail} 
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {profileSaving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-500 overflow-hidden border border-indigo-100 dark:border-indigo-800">
                  <AvatarDisplay avatar={user?.avatar} size={32} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-lg">{user?.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
