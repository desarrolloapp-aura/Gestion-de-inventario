import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username, password)
      // Esperar un momento para que el estado se actualice
      setTimeout(() => {
        setLoading(false)
        // Redirigir a la URL guardada o a la página principal
        // Si hay redirect, usarlo; si no, ir a la página principal
        console.log('[LOGIN] Redirect URL:', redirect)
        if (redirect) {
          console.log('[LOGIN] Redirigiendo a:', redirect)
          navigate(redirect, { replace: true })
        } else {
          console.log('[LOGIN] Redirigiendo a página principal')
          navigate('/', { replace: true })
        }
      }, 100)
    } catch (err: any) {
      console.error('Error en login:', err)
      const errorMessage = err.response?.data?.detail || err.message || 'Error al iniciar sesión'
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-minero-negro via-minero-carbono to-minero-negro">
      {/* Fondo con patrón minero */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255, 107, 53, 0.1) 35px, rgba(255, 107, 53, 0.1) 70px)`,
        }}></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 35px, rgba(220, 38, 38, 0.1) 35px, rgba(220, 38, 38, 0.1) 70px)`,
        }}></div>
      </div>
      
      {/* Efecto de luz/brillo */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-minero-naranja opacity-5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-minero-rojo opacity-5 rounded-full blur-3xl"></div>
      
      <div className="card-minero w-full max-w-md relative z-10 border-2 border-minero-naranja/30 shadow-2xl">
        <div className="text-center mb-8">
          <div className="mb-4">
            <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-minero-naranja to-minero-rojo bg-clip-text text-transparent">
              🛡️ AURA INGENIERÍA
            </h1>
          </div>
          <p className="text-minero-naranja text-lg font-semibold">Sistema de Gestión de Equipos</p>
          <div className="mt-4 h-1 w-24 bg-gradient-to-r from-transparent via-minero-naranja to-transparent mx-auto"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
              required
            />
          </div>

          {error && (
            <div className="alerta-urgente text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-minero w-full shadow-lg shadow-minero-naranja/50 hover:shadow-xl hover:shadow-minero-naranja/70"
          >
            {loading ? 'Iniciando sesión...' : 'INICIAR SESIÓN'}
          </button>
        </form>
      </div>
    </div>
  )
}

