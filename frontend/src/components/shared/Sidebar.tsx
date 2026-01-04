import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Sidebar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Solo mostrar sidebar para INFORMATICA y RRHH
  if (!user || (user.rol !== 'INFORMATICA' && user.rol !== 'RRHH')) {
    return null
  }

  const isActive = (path: string) => location.pathname === path

  const menuItems = [
    {
      label: 'Dashboard',
      path: '/',
      roles: ['INFORMATICA', 'RRHH']
    },
    {
      label: 'Equipos',
      path: '/equipos',
      roles: ['INFORMATICA']
    },
    {
      label: 'Trabajadores',
      path: '/trabajadores',
      roles: ['INFORMATICA', 'RRHH']
    },
    {
      label: 'Obras',
      path: '/obras',
      roles: ['INFORMATICA']
    },
  ]

  return (
    <aside className="w-72 bg-gray-900/80 backdrop-blur-md border-r border-gray-800/50 min-h-screen flex flex-col relative z-10">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-1">AURA</h1>
        <p className="text-sm text-gray-400">INGENIERÍA</p>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems
          .filter(item => item.roles.includes(user.rol))
          .map((item) => {
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center group ${
                  active
                    ? 'bg-gray-800/60 text-white border-l-2 border-gray-500'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border-l-2 border-transparent'
                }`}
              >
                <span className={`font-medium ${active ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
      </nav>

      {/* User Section / Ajustes */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => navigate('/ajustes')}
          className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center group ${
            isActive('/ajustes')
              ? 'bg-gray-800/60 text-white border-l-2 border-gray-500'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border-l-2 border-transparent'
          }`}
        >
          <div className="flex-1">
            <span className={`font-medium block ${isActive('/ajustes') ? 'font-semibold' : ''}`}>
              Ajustes
            </span>
            <span className="text-xs text-gray-500 mt-0.5 block truncate">
              {user.username}
            </span>
          </div>
        </button>
      </div>
    </aside>
  )
}
