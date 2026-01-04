import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import GlobalSearch from './GlobalSearch'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-gray-900/60 backdrop-blur-md border-b border-gray-800/50 px-6 py-4 relative z-10">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {user?.rol === 'INFORMATICA' && 'Informática'}
              {user?.rol === 'RRHH' && 'Recursos Humanos'}
              {user?.rol === 'JEFE_OBRA' && 'Jefe de Obra'}
            </h2>
            {user?.obra && (
              <p className="text-sm text-gray-400 mt-0.5">{user.obra}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGlobalSearch(true)}
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-600 text-sm font-medium flex items-center gap-2"
            title="Búsqueda global (Ctrl+K)"
          >
            🔍 Buscar
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors border border-red-600/30 text-sm font-medium"
          >
            Salir
          </button>
        </div>
      </div>
      {showGlobalSearch && (
        <GlobalSearch onClose={() => setShowGlobalSearch(false)} />
      )}
    </header>
  )
}




