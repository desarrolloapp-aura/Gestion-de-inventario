import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { prestamosService } from '../../services/prestamos'
import { Trabajador, AlertaTrabajador } from '../../types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useToast } from '../../context/ToastContext'

// Función helper para convertir fecha UTC a hora local de Chile
// El backend guarda en UTC, necesitamos convertir a hora de Chile (UTC-3)
const formatFechaChile = (fechaString: string) => {
  // Parsear la fecha (viene como UTC desde el backend)
  const fecha = new Date(fechaString)
  
  // Convertir de UTC a hora de Chile (UTC-3)
  // Restamos 3 horas (3 * 60 * 60 * 1000 ms)
  const fechaChile = new Date(fecha.getTime() - (3 * 60 * 60 * 1000))
  
  return format(fechaChile, "dd/MM/yyyy HH:mm", { locale: es })
}

interface Props {
  trabajador: Trabajador
  onClose: () => void
}

export default function ModalEquiposPrestados({ trabajador, onClose }: Props) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const { data: prestamos = [], isLoading, refetch } = useQuery({
    queryKey: ['prestamos', trabajador.rut],
    queryFn: () => prestamosService.getByRut(trabajador.rut),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  })

  // Forzar refetch cuando se abre el modal
  useEffect(() => {
    refetch()
  }, [trabajador.rut, refetch])

  const { data: alertas = [], isLoading: loadingAlertas } = useQuery({
    queryKey: ['alertas-trabajador', trabajador.rut],
    queryFn: () => prestamosService.getAlertasTrabajador(trabajador.rut),
  })

  const marcarCargadorMutation = useMutation({
    mutationFn: (prestamoId: number) => prestamosService.marcarCargadorDevuelto(prestamoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prestamos', trabajador.rut] })
      queryClient.invalidateQueries({ queryKey: ['alertas-trabajador', trabajador.rut] })
      showToast('Cargador marcado como devuelto', 'success')
    },
  })

  const eliminarMutation = useMutation({
    mutationFn: (prestamoId: number) => prestamosService.delete(prestamoId),
    onMutate: async (prestamoId) => {
      // Cancelar queries en progreso para evitar sobrescribir la actualización optimista
      await queryClient.cancelQueries({ queryKey: ['prestamos', trabajador.rut] })
      
      // Snapshot del valor anterior
      const previousPrestamos = queryClient.getQueryData(['prestamos', trabajador.rut])
      
      // Actualización optimista: eliminar el préstamo de la lista inmediatamente
      queryClient.setQueryData(['prestamos', trabajador.rut], (old: any) => {
        if (!old) return old
        return old.filter((p: any) => p.id !== prestamoId)
      })
      
      // Retornar contexto con el snapshot para rollback en caso de error
      return { previousPrestamos }
    },
    onError: (err, prestamoId, context) => {
      // En caso de error, revertir a los datos anteriores
      if (context?.previousPrestamos) {
        queryClient.setQueryData(['prestamos', trabajador.rut], context.previousPrestamos)
      }
      showToast('Error al eliminar registro', 'error')
    },
    onSuccess: () => {
      // Invalidar queries para sincronizar con el servidor
      queryClient.invalidateQueries({ queryKey: ['prestamos', trabajador.rut] })
      queryClient.invalidateQueries({ queryKey: ['alertas-trabajador', trabajador.rut] })
      queryClient.invalidateQueries({ queryKey: ['prestamos'] })
      queryClient.invalidateQueries({ queryKey: ['equipos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      showToast('Registro eliminado exitosamente', 'success')
    },
  })

  const handleEliminarRegistro = (prestamoId: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar este registro del historial? Esta acción no se puede deshacer.')) {
      eliminarMutation.mutate(prestamoId)
    }
  }

  // Filtrar préstamos
  const prestamosActivos = prestamos.filter(p => p.estado_prestamo === 'ASIGNADO')
  const prestamosDevueltos = prestamos
    .filter(p => p.estado_prestamo === 'DEVUELTO')
    .sort((a, b) => {
      const fechaA = a.fecha_devolucion ? new Date(a.fecha_devolucion).getTime() : 0
      const fechaB = b.fecha_devolucion ? new Date(b.fecha_devolucion).getTime() : 0
      return fechaB - fechaA
    })

  const handleMarcarCargadorDevuelto = (prestamoId: number) => {
    if (confirm('¿Marcar cargador como devuelto?')) {
      marcarCargadorMutation.mutate(prestamoId)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] left-72 pl-8" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col mx-8" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-800 bg-gray-900/50">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white mb-1 truncate">{trabajador.nombre}</h2>
              <p className="text-sm text-gray-400">RUT: {trabajador.rut} • {trabajador.obra}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-minero-naranja"></div>
              <p className="text-gray-400 mt-4">Cargando información...</p>
            </div>
          ) : prestamos.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-400 text-lg">No tiene historial de préstamos</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Alertas Pendientes */}
              {!loadingAlertas && alertas.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
                    ⚠️ Alertas Pendientes
                  </h3>
                  <div className="space-y-3">
                    {alertas.map((alerta: AlertaTrabajador) => (
                      <div key={alerta.prestamo_id} className="bg-gray-800/50 rounded-lg p-3 border border-red-500/20">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-white font-semibold">{alerta.equipo_serie} - {alerta.equipo_tipo}</p>
                            {alerta.fecha_devolucion && (
                              <p className="text-xs text-gray-400 mt-1">
                                Devuelto: {formatFechaChile(alerta.fecha_devolucion)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {alerta.problemas.map((problema, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-600/20 text-red-400 border border-red-600/30"
                            >
                              {problema === 'Sin cargador' ? '🔌 Sin cargador' : '❌ Equipo en mal estado'}
                            </span>
                          ))}
                        </div>
                        {alerta.observaciones && (
                          <p className="text-sm text-gray-300 mb-2">{alerta.observaciones}</p>
                        )}
                        {alerta.problemas.includes('Sin cargador') && !alerta.cargador_devuelto && (
                          <button
                            onClick={() => handleMarcarCargadorDevuelto(alerta.prestamo_id)}
                            disabled={marcarCargadorMutation.isPending}
                            className="mt-2 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded text-xs font-medium border border-green-600/30 transition-colors disabled:opacity-50"
                          >
                            {marcarCargadorMutation.isPending ? 'Procesando...' : 'Marcar cargador devuelto'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Equipos Activos */}
              {prestamosActivos.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">
                    Equipos Prestados ({prestamosActivos.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {prestamosActivos.map((prestamo) => (
                      <div
                        key={prestamo.id}
                        className="bg-gradient-to-br from-gray-800 via-gray-800/90 to-gray-900 border border-gray-700/50 rounded-xl p-5 hover:border-minero-naranja/50 hover:shadow-xl hover:shadow-minero-naranja/20 transition-all duration-200 backdrop-blur-sm"
                      >
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Serie</p>
                          <p className="text-xl font-bold text-minero-naranja">
                            {prestamo.equipo.serie}
                          </p>
                        </div>
                        <div className="mb-3">
                          <p className="text-sm text-gray-400 mb-1">Equipo</p>
                          <p className="text-white font-semibold">
                            {prestamo.equipo.tipo} {prestamo.equipo.marca} {prestamo.equipo.modelo}
                          </p>
                        </div>
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Fecha de préstamo</p>
                          <p className="text-sm text-gray-300">
                            {format(new Date(prestamo.fecha_prestamo), "dd/MM/yyyy", { locale: es })}
                          </p>
                        </div>
                        <div>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-400 border border-green-600/30">
                            Prestado
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historial de Devoluciones */}
              {prestamosDevueltos.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">
                    Historial de Devoluciones ({prestamosDevueltos.length})
                  </h3>
                  <div className="space-y-3">
                    {prestamosDevueltos.map((prestamo) => {
                      const tieneProblemas = 
                        (prestamo.estado_devolucion_con_cargador === false && !prestamo.cargador_devuelto_despues) ||
                        prestamo.estado_devolucion_bueno === false

                      return (
                        <div
                          key={prestamo.id}
                          className={`bg-gray-800/50 rounded-lg p-4 border ${
                            tieneProblemas ? 'border-red-500/30' : 'border-gray-700/50'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="text-white font-semibold">{prestamo.equipo.serie}</p>
                              <p className="text-sm text-gray-400">
                                {prestamo.equipo.tipo} {prestamo.equipo.marca} {prestamo.equipo.modelo}
                              </p>
                            </div>
                            {prestamo.fecha_devolucion && (
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Devuelto</p>
                                <p className="text-sm text-gray-300">
                                  {formatFechaChile(prestamo.fecha_devolucion)}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {tieneProblemas && (
                            <div className="mt-3 pt-3 border-t border-red-500/20">
                              <div className="flex flex-wrap gap-2 mb-2">
                                {prestamo.estado_devolucion_con_cargador === false && !prestamo.cargador_devuelto_despues && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-600/20 text-red-400 border border-red-600/30">
                                    🔌 Sin cargador
                                  </span>
                                )}
                                {prestamo.estado_devolucion_bueno === false && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-600/20 text-red-400 border border-red-600/30">
                                    ❌ Equipo en mal estado
                                  </span>
                                )}
                              </div>
                              {prestamo.observaciones_devolucion && (
                                <p className="text-sm text-gray-300 mb-2">{prestamo.observaciones_devolucion}</p>
                              )}
                              {prestamo.estado_devolucion_con_cargador === false && !prestamo.cargador_devuelto_despues && (
                                <button
                                  onClick={() => handleMarcarCargadorDevuelto(prestamo.id)}
                                  disabled={marcarCargadorMutation.isPending}
                                  className="mt-2 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded text-xs font-medium border border-green-600/30 transition-colors disabled:opacity-50"
                                >
                                  {marcarCargadorMutation.isPending ? 'Procesando...' : 'Marcar cargador devuelto'}
                                </button>
                              )}
                            </div>
                          )}
                          
                          {!tieneProblemas && (
                            <div className="mt-2 flex items-center justify-between">
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-600/20 text-green-400 border border-green-600/30">
                                Devuelto correctamente
                              </span>
                              <button
                                onClick={() => handleEliminarRegistro(prestamo.id)}
                                disabled={eliminarMutation.isPending}
                                className="px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs font-medium border border-red-600/30 transition-colors disabled:opacity-50"
                                title="Eliminar este registro del historial"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                          
                          {tieneProblemas && (
                            <div className="mt-2 flex items-center justify-end">
                              <button
                                onClick={() => handleEliminarRegistro(prestamo.id)}
                                disabled={eliminarMutation.isPending}
                                className="px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs font-medium border border-red-600/30 transition-colors disabled:opacity-50"
                                title="Eliminar este registro del historial"
                              >
                                🗑️ Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Sin equipos */}
              {prestamosActivos.length === 0 && prestamosDevueltos.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📦</div>
                  <p className="text-gray-400 text-lg">No tiene historial de préstamos</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
