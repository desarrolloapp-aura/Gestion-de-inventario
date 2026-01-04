import { EquipoConPrestamo } from '../../types'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { equiposService } from '../../services/equipos'
import { useToast } from '../../context/ToastContext'

// Función helper para convertir fecha UTC a hora local de Chile
const formatFechaChile = (fechaString: string) => {
  const fecha = new Date(fechaString)
  const fechaChile = new Date(fecha.getTime() - (3 * 60 * 60 * 1000))
  return format(fechaChile, "dd/MM/yyyy HH:mm", { locale: es })
}

interface Props {
  equipos: EquipoConPrestamo[]
  onPrestar: (id: number) => void
  onDevolver?: (id: number) => void
  onEditar?: (id: number) => void
  onEliminar?: (id: number) => void
  showDevolverButton?: boolean
  showDescargarQR?: boolean
}

export default function EquipoGrid({ equipos, onPrestar, onDevolver, onEditar, onEliminar, showDevolverButton = true, showDescargarQR = false }: Props) {
  const { user } = useAuth()
  const { showToast } = useToast()
  
  const handleDescargarQR = async (equipoId: number, serie: string) => {
    try {
      await equiposService.descargarQR(equipoId)
      showToast(`QR descargado para equipo ${serie}`, 'success')
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Error al descargar QR', 'error')
    }
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {equipos.map((equipo) => (
        <div key={equipo.id} className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6 hover:border-gray-600/50 transition-all duration-200">
          
          {/* Header con Serie y Estado */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-xl font-bold text-white mb-1 tracking-tight">
                {equipo.serie}
              </p>
              <p className="text-sm text-gray-400">
                {equipo.tipo} {equipo.marca} {equipo.modelo}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded text-xs font-medium ${
                equipo.estado_dispositivo === 'OPERATIVO'
                  ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                  : equipo.estado_dispositivo === 'MANTENCIÓN'
                  ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30'
                  : 'bg-red-600/20 text-red-400 border border-red-600/30'
              }`}
            >
              {equipo.estado_dispositivo}
            </span>
          </div>

          {/* Estado de préstamo activo */}
          {equipo.prestamo_activo && (
            <div className="mb-4 p-3 bg-gray-700/30 rounded border border-gray-600/30">
              <p className="text-xs text-gray-500 mb-1">Prestado a</p>
              <p className="text-sm text-white font-medium">
                {equipo.prestamo_activo.trabajador.nombre}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {equipo.prestamo_activo.trabajador.obra}
              </p>
            </div>
          )}

          {/* Información del último préstamo devuelto */}
          {!equipo.prestamo_activo && equipo.ultimo_prestamo_devuelto && (
            <div className="mb-4 p-3 bg-gray-700/30 rounded border border-gray-600/30">
              <p className="text-xs text-gray-500 mb-1">Último préstamo</p>
              <p className="text-sm text-white font-medium">
                {equipo.ultimo_prestamo_devuelto.trabajador.nombre}
              </p>
              {equipo.ultimo_prestamo_devuelto.fecha_devolucion && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Devuelto: {formatFechaChile(equipo.ultimo_prestamo_devuelto.fecha_devolucion)}
                </p>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="mt-4 pt-4 border-t border-gray-700/50">
            {/* Botón principal (Prestar o Devolver) */}
            {!equipo.prestamo_activo && (
              <button
                onClick={() => onPrestar(equipo.id)}
                className="w-full inline-flex items-center justify-center rounded-lg bg-minero-naranja hover:bg-minero-naranja-oscuro text-white font-medium px-4 py-2.5 transition-all duration-200 mb-3"
              >
                Prestar
              </button>
            )}

            {equipo.prestamo_activo && user?.rol === 'INFORMATICA' && onDevolver && showDevolverButton && (
              <button
                onClick={() => onDevolver(equipo.id)}
                className="w-full inline-flex items-center justify-center rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 font-medium px-4 py-2.5 transition-all duration-200 border border-green-600/30 mb-3"
              >
                Devolver Equipo
              </button>
            )}

            {/* Botones secundarios en grid */}
            {(user?.rol === 'INFORMATICA' && (onEditar || onEliminar)) || showDescargarQR ? (
              <div className="grid grid-cols-2 gap-2">
                {user?.rol === 'INFORMATICA' && onEditar && (
                  <button
                    onClick={() => onEditar(equipo.id)}
                    className="inline-flex items-center justify-center rounded-lg bg-gray-700/50 hover:bg-gray-700 text-white font-medium px-3 py-2 text-sm transition-all duration-200 border border-gray-600"
                  >
                    Editar
                  </button>
                )}

                {user?.rol === 'INFORMATICA' && onEliminar && (
                  <button
                    onClick={() => onEliminar(equipo.id)}
                    className="inline-flex items-center justify-center px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-all duration-200 border border-red-600/30"
                  >
                    Eliminar
                  </button>
                )}
                
                {/* Botón para descargar QR - Solo en vista de gestión de equipos */}
                {showDescargarQR && (
                  <button
                    onClick={() => handleDescargarQR(equipo.id, equipo.serie)}
                    className="inline-flex items-center justify-center rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 font-medium px-3 py-2 text-sm transition-all duration-200 border border-purple-600/30"
                    title="Descargar código QR para imprimir y pegar en el equipo"
                  >
                    QR
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

