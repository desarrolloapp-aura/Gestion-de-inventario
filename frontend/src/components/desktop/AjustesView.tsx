import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/auth'

export default function AjustesView() {
  const { user } = useAuth()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const mutation = useMutation({
    mutationFn: () => authService.changePassword(oldPassword, newPassword),
    onSuccess: () => {
      setSuccess('Contraseña actualizada exitosamente')
      setError('')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(''), 5000)
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Error al cambiar la contraseña')
      setSuccess('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Todos los campos son requeridos')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden')
      return
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }

    mutation.mutate()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">⚙️ AJUSTES</h1>

      {/* Información del usuario */}
      <div className="mb-8 bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Información del Usuario</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="text-gray-400 w-32">Usuario:</span>
            <span className="text-white font-medium">{user?.username}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 w-32">Email:</span>
            <span className="text-white font-medium">{user?.email || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 w-32">Rol:</span>
            <span className="px-3 py-1 bg-minero-naranja/20 text-minero-naranja rounded-lg text-sm font-medium">
              {user?.rol}
            </span>
          </div>
          {user?.obra && (
            <div className="flex items-center gap-4">
              <span className="text-gray-400 w-32">Obra:</span>
              <span className="text-white font-medium">{user.obra}</span>
            </div>
          )}
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Cambiar Contraseña</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contraseña Actual
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => {
                setOldPassword(e.target.value)
                setError('')
              }}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nueva Contraseña
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                setError('')
              }}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja text-white"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setError('')
              }}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja text-white"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-600/20 border border-red-600/50 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-600/20 border border-green-600/50 rounded-lg">
              <p className="text-sm text-green-400">{success}</p>
            </div>
          )}

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-minero-naranja hover:bg-minero-naranja-oscuro text-white font-medium px-6 py-2.5 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-minero-naranja/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? '⏳ Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}


