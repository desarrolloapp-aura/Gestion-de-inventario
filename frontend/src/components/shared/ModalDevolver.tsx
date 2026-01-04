import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { prestamosService } from '../../services/prestamos'
import { equiposService } from '../../services/equipos'
import { useToast } from '../../context/ToastContext'

interface Props {
  equipoId: number
  onClose: () => void
}

export default function ModalDevolver({ equipoId, onClose }: Props) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [error, setError] = useState<string>('')
  const [estadoBueno, setEstadoBueno] = useState<boolean>(true)
  const [conCargador, setConCargador] = useState<boolean>(true)
  const [observaciones, setObservaciones] = useState<string>('')

  const { data: equipo, isLoading } = useQuery({
    queryKey: ['equipo', equipoId],
    queryFn: () => equiposService.getById(equipoId),
  })

  const prestamoId = equipo?.prestamo_activo?.id
  
  // Inicializar estado basado en el estado al entregar (si existe)
  useEffect(() => {
    const prestamo = equipo?.prestamo_activo
    if (prestamo && prestamo.estado_entrega_bueno !== undefined && prestamo.estado_entrega_bueno !== null) {
      setEstadoBueno(prestamo.estado_entrega_bueno)
    }
    if (prestamo && prestamo.estado_entrega_con_cargador !== undefined && prestamo.estado_entrega_con_cargador !== null) {
      setConCargador(prestamo.estado_entrega_con_cargador)
    }
  }, [equipo])

  const mutation = useMutation({
    mutationFn: () => {
      if (!prestamoId) throw new Error('No hay préstamo activo')
      return prestamosService.devolver(prestamoId, {
        estado_devolucion_bueno: estadoBueno,
        estado_devolucion_con_cargador: conCargador,
        observaciones_devolucion: observaciones.trim() || undefined,
      })
    },
    onSuccess: (data) => {
      // Invalidar todos los queries relacionados
      queryClient.invalidateQueries({ queryKey: ['equipos'] })
      queryClient.invalidateQueries({ queryKey: ['prestamos'] })
      queryClient.invalidateQueries({ queryKey: ['alertas'] })
      queryClient.invalidateQueries({ queryKey: ['alertas-trabajador'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      // Invalidar específicamente el query del trabajador si tenemos su RUT
      if (data?.trabajador?.rut) {
        queryClient.invalidateQueries({ queryKey: ['prestamos', data.trabajador.rut] })
      }
      showToast('Equipo devuelto exitosamente', 'success')
      onClose()
    },
    onError: (err: any) => {
      const errorMessage =
        err.response?.data?.detail || err.message || 'Error al devolver el equipo'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    },
  })

  // Mostrar spinner mientras carga o si no hay datos aún
  if (isLoading || !equipo || !prestamoId || !equipo.prestamo_activo) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="card-minero w-full max-w-md">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-minero-naranja mx-auto"></div>
          <p className="text-center mt-4">Cargando información...</p>
        </div>
      </div>
    )
  }

  const prestamoFinal = equipo.prestamo_activo
  const fechaVencimiento = prestamoFinal.fecha_vencimiento
    ? new Date(prestamoFinal.fecha_vencimiento).toLocaleDateString('es-CL')
    : 'N/A'

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-3xl">📥</span>
              Devolver Equipo
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Información del equipo */}
          <div className="bg-gradient-to-r from-gray-800/50 to-gray-800/30 rounded-xl p-4 border border-gray-700/50">
            <p className="serie-monospace text-minero-naranja text-xl font-bold mb-1">
              {equipo.serie}
            </p>
            <p className="text-gray-300 font-medium">
              {equipo.tipo} {equipo.marca} {equipo.modelo}
            </p>
          </div>

          {/* Información del préstamo */}
          <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Información del Préstamo
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Trabajador</p>
                <p className="text-white font-medium">{prestamoFinal.trabajador.nombre}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">RUT</p>
                <p className="text-white">{prestamoFinal.trabajador.rut}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Obra</p>
                <p className="text-white">{prestamoFinal.trabajador.obra}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Fecha de Vencimiento</p>
                <p className="text-white">{fechaVencimiento}</p>
              </div>
            </div>
          </div>

          {/* Estado al entregar */}
          {prestamoFinal.estado_entrega_bueno !== null && prestamoFinal.estado_entrega_bueno !== undefined && (
            <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span>📤</span>
                Estado al Entregar
              </h3>
              <div className="flex gap-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${prestamoFinal.estado_entrega_bueno ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
                    {prestamoFinal.estado_entrega_bueno ? (
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Estado</p>
                    <p className={`font-medium ${prestamoFinal.estado_entrega_bueno ? 'text-green-400' : 'text-red-400'}`}>
                      {prestamoFinal.estado_entrega_bueno ? 'Bueno' : 'No bueno'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${prestamoFinal.estado_entrega_con_cargador ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
                    {prestamoFinal.estado_entrega_con_cargador ? (
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Cargador</p>
                    <p className={`font-medium ${prestamoFinal.estado_entrega_con_cargador ? 'text-green-400' : 'text-red-400'}`}>
                      {prestamoFinal.estado_entrega_con_cargador ? 'Incluido' : 'No incluido'}
                    </p>
                  </div>
                </div>
              </div>
              {prestamoFinal.observaciones_entrega && (
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                  <p className="text-xs text-gray-500 mb-1">Observaciones</p>
                  <p className="text-gray-300 text-sm">{prestamoFinal.observaciones_entrega}</p>
                </div>
              )}
            </div>
          )}

          {/* Verificación de estado al devolver */}
          <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span>⚠️</span>
              Verificar Estado al Devolver
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={estadoBueno}
                  onChange={(e) => setEstadoBueno(e.target.checked)}
                  className="mt-1 w-5 h-5 text-minero-naranja bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-minero-naranja focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-white font-medium block">El equipo está en buen estado</span>
                  <span className="text-xs text-gray-500">Verifica que el equipo no tenga daños visibles</span>
                </div>
              </label>
              
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={conCargador}
                  onChange={(e) => setConCargador(e.target.checked)}
                  className="mt-1 w-5 h-5 text-minero-naranja bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-minero-naranja focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-white font-medium block">El equipo incluye cargador</span>
                  <span className="text-xs text-gray-500">Confirma que el cargador original está incluido</span>
                </div>
              </label>
            </div>

            {(!estadoBueno || !conCargador) && (
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <label className="block text-sm font-medium mb-2 text-white">
                  Especificar qué no está bien:
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ej: Sin cargador, pantalla rayada, teclas faltantes, daños en la carcasa..."
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-minero-naranja focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Mostrar errores */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-sm text-red-400 flex items-center gap-2">
                <span>⚠️</span>
                {error}
              </p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setError('')
                mutation.mutate()
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  <span>Devolviendo...</span>
                </>
              ) : (
                <span>Confirmar Devolución</span>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={mutation.isPending}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}




