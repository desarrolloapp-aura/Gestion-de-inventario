import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trabajadoresService } from '../../services/trabajadores'
import { configService } from '../../services/config'
import { prestamosService } from '../../services/prestamos'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { exportToExcel } from '../../utils/excelExport'
import ModalCrearTrabajador from '../shared/ModalCrearTrabajador'
import ModalEquiposPrestados from '../shared/ModalEquiposPrestados'
import { Trabajador } from '../../types'

export default function TrabajadoresView() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showCrearModal, setShowCrearModal] = useState(false)
  const [selectedTrabajador, setSelectedTrabajador] = useState<Trabajador | null>(null)
  const [obraFilter, setObraFilter] = useState<string>('')
  const [nombreSearch, setNombreSearch] = useState<string>('')

  // Obtener trabajadores
  const { data: trabajadoresData = [], isLoading } = useQuery({
    queryKey: ['trabajadores', obraFilter],
    queryFn: () => trabajadoresService.getAll({ obra: obraFilter || undefined, activo: undefined }),
  })

  // Filtrar trabajadores por nombre/apellido
  const trabajadores = trabajadoresData.filter((t) => {
    if (!nombreSearch.trim()) return true
    const searchTerm = nombreSearch.toLowerCase().trim()
    const nombres = t.nombre.toLowerCase().split(' ')
    return nombres.some(nombre => nombre.includes(searchTerm))
  })

  // Obtener obras para filtro
  const { data: obras = [] } = useQuery({
    queryKey: ['obras'],
    queryFn: () => configService.getObras(),
  })

  // Mutation para marcar como despedido
  const marcarDespidoMutation = useMutation({
    mutationFn: (rut: string) => trabajadoresService.marcarDespido(rut),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trabajadores'] })
      queryClient.invalidateQueries({ queryKey: ['alertas'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      showToast('Trabajador marcado como despedido', 'success')
    },
    onError: (err: any) => {
      showToast(err.response?.data?.detail || 'Error al marcar como despedido', 'error')
    },
  })

  const handleMarcarDespido = (rut: string, nombre: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(`¿Marcar a ${nombre} como despedido?`)) {
      marcarDespidoMutation.mutate(rut)
    }
  }

  // Componente para mostrar alertas del trabajador
  function TrabajadorAlertasBadge({ trabajador }: { trabajador: Trabajador }) {
    const { data: alertas = [] } = useQuery({
      queryKey: ['alertas-trabajador', trabajador.rut],
      queryFn: () => prestamosService.getAlertasTrabajador(trabajador.rut),
      enabled: trabajador.activo, // Solo cargar si está activo
    })

    if (!trabajador.activo || alertas.length === 0) return null

    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-600/20 text-red-400 border border-red-600/30">
        ⚠️ {alertas.length} problema{alertas.length !== 1 ? 's' : ''} pendiente{alertas.length !== 1 ? 's' : ''}
      </span>
    )
  }

  const handleTrabajadorClick = (trabajador: Trabajador) => {
    setSelectedTrabajador(trabajador)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Trabajadores</h1>
          <p className="text-gray-400">Gestiona los trabajadores del sistema</p>
        </div>
        <div className="flex gap-3">
          {trabajadores && trabajadores.length > 0 && (
            <button
              onClick={() => {
                const datosExport = trabajadores.map(t => ({
                  RUT: t.rut,
                  Nombre: t.nombre,
                  Obra: t.obra,
                  Teléfono: t.telefono || '',
                  Email: t.email || '',
                  Estado: t.activo ? 'Activo' : 'Inactivo',
                }))
                exportToExcel(datosExport, 'trabajadores')
                showToast('Reporte exportado exitosamente', 'success')
              }}
              className="inline-flex items-center justify-center rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 font-medium px-4 py-2.5 transition-all duration-200 hover:scale-105 active:scale-95 border border-green-600/30"
            >
              📊 Exportar Excel
            </button>
          )}
          {(user?.rol === 'INFORMATICA' || user?.rol === 'RRHH') && (
            <button
              onClick={() => setShowCrearModal(true)}
              className="inline-flex items-center justify-center rounded-lg bg-minero-naranja hover:bg-minero-naranja-oscuro text-white font-medium px-6 py-2.5 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-minero-naranja/20"
            >
            <span className="mr-2">➕</span>
            Crear Trabajador
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por nombre o apellido..."
          value={nombreSearch}
          onChange={(e) => setNombreSearch(e.target.value)}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-minero-naranja transition-colors flex-1 min-w-[250px]"
        />
        <select
          value={obraFilter}
          onChange={(e) => setObraFilter(e.target.value)}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-minero-naranja transition-colors"
        >
          <option value="">Todas las obras</option>
          {obras.map((obra) => (
            <option key={obra} value={obra}>
              {obra}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de trabajadores */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-minero-naranja"></div>
          <p className="text-gray-400 mt-4">Cargando trabajadores...</p>
        </div>
      ) : trabajadores.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
          <div className="text-6xl mb-4">👥</div>
          <p className="text-gray-400 text-lg mb-4">No hay trabajadores registrados</p>
          {(user?.rol === 'INFORMATICA' || user?.rol === 'RRHH') && (
            <button
              onClick={() => setShowCrearModal(true)}
              className="inline-flex items-center justify-center rounded-lg bg-minero-naranja hover:bg-minero-naranja-oscuro text-white font-medium px-6 py-2.5 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              ➕ Crear primer trabajador
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trabajadores.map((trabajador) => (
            <div
              key={trabajador.rut}
              onClick={() => handleTrabajadorClick(trabajador)}
              className="bg-gradient-to-br from-gray-800 via-gray-800/90 to-gray-900 border border-gray-700/50 rounded-xl p-5 hover:border-minero-naranja/50 hover:shadow-xl hover:shadow-minero-naranja/20 transition-all duration-200 cursor-pointer group backdrop-blur-sm"
            >
              {/* Estado activo/inactivo y alertas */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      trabajador.activo
                        ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                        : 'bg-red-600/20 text-red-400 border border-red-600/30'
                    }`}
                  >
                    {trabajador.activo ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                  <TrabajadorAlertasBadge trabajador={trabajador} />
                </div>
                <span className="text-xs text-gray-500">{trabajador.rut}</span>
              </div>

              {/* Nombre */}
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-minero-naranja transition-colors">
                {trabajador.nombre}
              </h3>

              {/* Obra */}
              <div className="mb-4">
                <span className="text-xs text-gray-500 mb-1 block">Obra</span>
                <p className="text-minero-naranja font-semibold">{trabajador.obra}</p>
              </div>

              {/* Contacto */}
              {(trabajador.telefono || trabajador.email) && (
                <div className="mb-4 space-y-1 text-sm">
                  {trabajador.telefono && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <span>📞</span>
                      <span>{trabajador.telefono}</span>
                    </div>
                  )}
                  {trabajador.email && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <span>✉️</span>
                      <span className="truncate">{trabajador.email}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Click indicator */}
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <p className="text-xs text-gray-500 group-hover:text-minero-naranja transition-colors">
                  👆 Click para ver equipos prestados
                </p>
              </div>

              {/* Acciones */}
              {user?.rol === 'RRHH' && trabajador.activo && (
                <button
                  onClick={(e) => handleMarcarDespido(trabajador.rut, trabajador.nombre, e)}
                  className="w-full mt-3 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors text-sm font-medium border border-red-600/30"
                  disabled={marcarDespidoMutation.isPending}
                >
                  🚫 Marcar como Despedido
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal crear trabajador */}
      {showCrearModal && (
        <ModalCrearTrabajador
          onClose={() => setShowCrearModal(false)}
        />
      )}

      {/* Modal equipos prestados */}
      {selectedTrabajador && (
        <ModalEquiposPrestados
          trabajador={selectedTrabajador}
          onClose={() => setSelectedTrabajador(null)}
        />
      )}
    </div>
  )
}
