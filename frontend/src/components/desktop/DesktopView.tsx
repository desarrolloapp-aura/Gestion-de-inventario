import { useQuery } from '@tanstack/react-query'
import { equiposService } from '../../services/equipos'
import { alertasService } from '../../services/alertas'
import { configService } from '../../services/config'
import { prestamosService } from '../../services/prestamos'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { exportToExcel } from '../../utils/excelExport'
import EquipoGrid from './EquipoGrid'
import AlertasPanel from './AlertasPanel'
import DashboardStats from './DashboardStats'
import ModalPrestar from '../shared/ModalPrestar'
import ModalDevolver from '../shared/ModalDevolver'

export default function DesktopView() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [obraFilter, setObraFilter] = useState<string>('')
  const [serieSearch, setSerieSearch] = useState<string>('')
  const [showPrestarModal, setShowPrestarModal] = useState(false)
  const [showDevolverModal, setShowDevolverModal] = useState(false)
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<number | null>(null)

  const { data: equipos, isLoading } = useQuery({
    queryKey: ['equipos', obraFilter, serieSearch],
    queryFn: () =>
      equiposService.getAll({
        obra: obraFilter || undefined,
        serie: serieSearch || undefined,
      }),
  })

  const { data: alertas } = useQuery({
    queryKey: ['alertas', obraFilter],
    queryFn: () => alertasService.getAll(obraFilter || undefined),
  })
  
  // Obtener obras dinámicamente
  const { data: obras = [] } = useQuery({
    queryKey: ['obras'],
    queryFn: () => configService.getObras(),
  })

  const handlePrestar = (equipoId: number) => {
    setEquipoSeleccionado(equipoId)
    setShowPrestarModal(true)
  }

  const handleDevolver = (equipoId: number) => {
    setEquipoSeleccionado(equipoId)
    setShowDevolverModal(true)
  }

  const alertasUrgentes = alertas?.filter(
    (a) => a.tipo === 'VENCIDO' || a.tipo === 'DESPIDO'
  ) || []

  return (
    <div className="p-6">
      {/* Título y bienvenida */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Vista general de equipos y alertas</p>
        </div>
        {equipos && equipos.length > 0 && (
          <button
            onClick={async () => {
              try {
                const prestamos = await prestamosService.getAll({ estado: 'ASIGNADO' })
                const datosExport = prestamos.map(p => ({
                  'Equipo Serie': p.equipo.serie,
                  'Equipo Tipo': p.equipo.tipo,
                  'Trabajador': p.trabajador.nombre,
                  'RUT': p.trabajador.rut,
                  'Obra': p.trabajador.obra,
                  'Fecha Préstamo': new Date(p.fecha_prestamo).toLocaleDateString('es-CL'),
                  'Fecha Vencimiento': new Date(p.fecha_vencimiento).toLocaleDateString('es-CL'),
                }))
                exportToExcel(datosExport, 'prestamos_activos')
                showToast('Reporte exportado exitosamente', 'success')
              } catch (error) {
                showToast('Error al exportar reporte', 'error')
              }
            }}
            className="inline-flex items-center justify-center rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 font-medium px-4 py-2.5 transition-all duration-200 hover:scale-105 active:scale-95 border border-green-600/30"
          >
            📊 Exportar Préstamos Activos
          </button>
        )}
      </div>

      {/* Estadísticas del Dashboard */}
      <DashboardStats />

      {/* Alertas urgentes */}
      {alertasUrgentes.length > 0 && (
        <div className="mb-6">
          <AlertasPanel alertas={alertasUrgentes} />
        </div>
      )}

      {/* Filtros */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <select
          value={obraFilter}
          onChange={(e) => setObraFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-minero-naranja"
        >
          <option value="">Todas las obras</option>
          {obras.map((obra) => (
            <option key={obra} value={obra}>
              {obra}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Buscar por serie..."
          value={serieSearch}
          onChange={(e) => setSerieSearch(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg flex-1 min-w-[200px] text-white focus:outline-none focus:ring-2 focus:ring-minero-naranja"
        />
      </div>

      {/* Grid de equipos */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-minero-naranja"></div>
          <p className="text-gray-400 mt-4">Cargando equipos...</p>
        </div>
      ) : equipos && equipos.length > 0 ? (
        <EquipoGrid 
          equipos={equipos} 
          onPrestar={handlePrestar}
          onDevolver={user?.rol === 'INFORMATICA' ? handleDevolver : undefined}
          showDevolverButton={true}
        />
      ) : (
        <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
          <p className="text-gray-400">No hay equipos disponibles</p>
        </div>
      )}

      {showPrestarModal && equipoSeleccionado && (
        <ModalPrestar
          equipoId={equipoSeleccionado}
          onClose={() => {
            setShowPrestarModal(false)
            setEquipoSeleccionado(null)
          }}
        />
      )}

      {showDevolverModal && equipoSeleccionado && (
        <ModalDevolver
          equipoId={equipoSeleccionado}
          onClose={() => {
            setShowDevolverModal(false)
            setEquipoSeleccionado(null)
          }}
        />
      )}

    </div>
  )
}

