import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { prestamosService } from '../../services/prestamos'
import { trabajadoresService } from '../../services/trabajadores'
import { equiposService } from '../../services/equipos'
import { useToast } from '../../context/ToastContext'
import { Trabajador } from '../../types'

interface Props {
  equipoId: number
  equipoInfo: any
  isPrestado: boolean
  onClose: () => void
}

export default function PrestamoMovilView({ equipoId, equipoInfo, isPrestado, onClose }: Props) {
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [estadoBueno, setEstadoBueno] = useState<boolean>(true)
  const [conCargador, setConCargador] = useState<boolean>(true)
  const [observaciones, setObservaciones] = useState<string>('')
  const [estadoDevolucionBueno, setEstadoDevolucionBueno] = useState<boolean>(true)
  const [conCargadorDevolucion, setConCargadorDevolucion] = useState<boolean>(true)
  const [observacionesDevolucion, setObservacionesDevolucion] = useState<string>('')
  const [mostrarExito, setMostrarExito] = useState<boolean>(false)
  const [mensajeExito, setMensajeExito] = useState<string>('')
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  // Prevenir volver atrás después de completar la operación
  useEffect(() => {
    if (mostrarExito) {
      // Reemplazar el historial para que no se pueda volver atrás
      window.history.replaceState(null, '', window.location.href)
      
      // Prevenir el botón de retroceso
      const handlePopState = (e: PopStateEvent) => {
        e.preventDefault()
        window.history.pushState(null, '', window.location.href)
      }
      
      window.addEventListener('popstate', handlePopState)
      
      return () => {
        window.removeEventListener('popstate', handlePopState)
      }
    }
  }, [mostrarExito])

  // Obtener información del equipo - siempre hacer refetch para obtener estado actualizado
  const { data: equipo } = useQuery({
    queryKey: ['equipo', equipoId],
    queryFn: () => equiposService.getById(equipoId),
    // Refetch para obtener información actualizada después de préstamos/devoluciones
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    // Invalidar cache cuando se completa una operación
    staleTime: 0,
  })
  
  // Determinar si está prestado: 
  // 1. Usar isPrestado del prop (viene de equipoInfo del QR)
  // 2. Si no está disponible, usar equipo?.prestamo_activo
  const estaPrestado = isPrestado || (equipo?.prestamo_activo !== null && equipo?.prestamo_activo !== undefined)

  // Obtener trabajadores activos
  const { data: trabajadores = [], isLoading: loadingTrabajadores } = useQuery({
    queryKey: ['trabajadores'],
    queryFn: () => trabajadoresService.getAll({ activo: true }),
  })

  // Obtener trabajador seleccionado
  const trabajador: Trabajador | undefined = trabajadores.find(
    (t) => t.rut === trabajadorSeleccionado
  )

  // Obtener alertas del trabajador seleccionado
  const { data: alertasTrabajador = [] } = useQuery({
    queryKey: ['alertas-trabajador', trabajador?.rut],
    queryFn: () => prestamosService.getAlertasTrabajador(trabajador!.rut),
    enabled: !!trabajador,
  })

  // Mutation para préstamo
  const mutationPrestar = useMutation({
    mutationFn: () => {
      if (!trabajador) throw new Error('Debes seleccionar un trabajador')
      return prestamosService.create({
        equipo_id: equipoId,
        trabajador_rut: trabajador.rut,
        obra: trabajador.obra,
        estado_entrega_bueno: estadoBueno,
        estado_entrega_con_cargador: conCargador,
        observaciones_entrega: observaciones.trim() || undefined,
      })
    },
    onSuccess: () => {
      // Invalidar queries para actualizar el estado
      queryClient.invalidateQueries({ queryKey: ['equipos'] })
      queryClient.invalidateQueries({ queryKey: ['equipo', equipoId] }) // Invalidar específicamente este equipo
      queryClient.invalidateQueries({ queryKey: ['prestamos'] })
      queryClient.invalidateQueries({ queryKey: ['alertas'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      
      // Mostrar mensaje de éxito
      setMensajeExito('✅ Equipo asignado exitosamente')
      setMostrarExito(true)
      
      // Cerrar después de 2 segundos
      setTimeout(() => {
        // Intentar cerrar la ventana
        if (window.opener) {
          window.close()
        } else {
          // Si no se puede cerrar, redirigir a una página en blanco
          window.location.href = 'about:blank'
        }
      }, 2000)
    },
    onError: (err: any) => {
      const errorMessage =
        err.response?.data?.detail || err.message || 'Error al crear el préstamo'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    },
  })

  // Mutation para devolución
  const mutationDevolver = useMutation({
    mutationFn: () => {
      if (!equipo?.prestamo_activo?.id) throw new Error('No hay préstamo activo')
      return prestamosService.devolver(equipo.prestamo_activo.id, {
        estado_devolucion_bueno: estadoDevolucionBueno,
        estado_devolucion_con_cargador: conCargadorDevolucion,
        observaciones_devolucion: observacionesDevolucion.trim() || undefined,
      })
    },
    onSuccess: () => {
      // Invalidar queries para actualizar el estado
      queryClient.invalidateQueries({ queryKey: ['equipos'] })
      queryClient.invalidateQueries({ queryKey: ['equipo', equipoId] }) // Invalidar específicamente este equipo
      queryClient.invalidateQueries({ queryKey: ['prestamos'] })
      queryClient.invalidateQueries({ queryKey: ['alertas'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      
      // Mostrar mensaje de éxito
      setMensajeExito('✅ Devolución completada exitosamente')
      setMostrarExito(true)
      
      // Cerrar después de 2 segundos
      setTimeout(() => {
        // Intentar cerrar la ventana
        if (window.opener) {
          window.close()
        } else {
          // Si no se puede cerrar, redirigir a una página en blanco
          window.location.href = 'about:blank'
        }
      }, 2000)
    },
    onError: (err: any) => {
      const errorMessage =
        err.response?.data?.detail || err.message || 'Error al devolver el equipo'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    },
  })

  // Inicializar estado de devolución basado en el estado al entregar
  useEffect(() => {
    const prestamo = equipo?.prestamo_activo
    if (prestamo && prestamo.estado_entrega_bueno !== undefined && prestamo.estado_entrega_bueno !== null) {
      setEstadoDevolucionBueno(prestamo.estado_entrega_bueno)
    }
    if (prestamo && prestamo.estado_entrega_con_cargador !== undefined && prestamo.estado_entrega_con_cargador !== null) {
      setConCargadorDevolucion(prestamo.estado_entrega_con_cargador)
    }
  }, [equipo])

  const handleSubmitPrestar = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!trabajadorSeleccionado) {
      setError('Debes seleccionar un trabajador')
      return
    }

    mutationPrestar.mutate()
  }

  const handleSubmitDevolver = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    mutationDevolver.mutate()
  }

  // Vista de éxito
  if (mostrarExito) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-minero-negro via-minero-carbono to-minero-negro flex items-center justify-center p-4 z-50">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-6">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{mensajeExito}</h2>
            <p className="text-gray-400">Cerrando...</p>
          </div>
        </div>
      </div>
    )
  }

  // Vista de devolución - mostrar si está prestado según la información disponible
  const prestamoActivo = equipo?.prestamo_activo
  const mostrarDevolucion = estaPrestado && (prestamoActivo || equipoInfo?.prestado)
  
  if (mostrarDevolucion && prestamoActivo) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-minero-negro via-minero-carbono to-minero-negro p-4 overflow-y-auto z-50">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-6 pt-8">
            <h1 className="text-3xl font-bold text-white mb-2">📥 Devolver Equipo</h1>
            <div className="h-1 w-24 bg-minero-naranja mx-auto rounded"></div>
          </div>

          {/* Información del equipo */}
          {equipo && (
            <div className="bg-minero-gris/30 rounded-xl p-4 mb-6 border border-minero-naranja/30">
              <p className="text-minero-naranja text-xl font-bold mb-1">{equipo.serie}</p>
              <p className="text-gray-300 text-sm">{equipo.tipo} {equipo.marca} {equipo.modelo}</p>
            </div>
          )}

          {/* Estado al entregar */}
          {equipo?.prestamo_activo && (
            <div className="bg-minero-gris/20 rounded-xl p-4 mb-6">
              <p className="text-gray-400 text-sm mb-3">Estado al entregar:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${equipo.prestamo_activo.estado_entrega_bueno ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-white text-sm">
                    {equipo.prestamo_activo.estado_entrega_bueno ? 'Equipo en buen estado' : 'Equipo con daños'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${equipo.prestamo_activo.estado_entrega_con_cargador ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-white text-sm">
                    {equipo.prestamo_activo.estado_entrega_con_cargador ? 'Con cargador' : 'Sin cargador'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmitDevolver} className="space-y-4">
            {/* Estado de devolución */}
            <div className="space-y-3">
              <label className="block text-white font-medium">Estado del equipo al devolver:</label>
              
              <label className="flex items-center gap-3 p-3 bg-minero-gris/30 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={estadoDevolucionBueno}
                  onChange={(e) => setEstadoDevolucionBueno(e.target.checked)}
                  className="w-5 h-5 rounded border-minero-naranja text-minero-naranja focus:ring-minero-naranja"
                />
                <span className="text-white">Equipo en buen estado</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-minero-gris/30 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={conCargadorDevolucion}
                  onChange={(e) => setConCargadorDevolucion(e.target.checked)}
                  className="w-5 h-5 rounded border-minero-naranja text-minero-naranja focus:ring-minero-naranja"
                />
                <span className="text-white">Con cargador</span>
              </label>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-white font-medium mb-2">Observaciones (opcional):</label>
              <textarea
                value={observacionesDevolucion}
                onChange={(e) => setObservacionesDevolucion(e.target.value)}
                placeholder="Notas sobre el estado del equipo..."
                className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-minero-naranja resize-none"
                rows={3}
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={mutationDevolver.isPending}
              className="w-full py-4 bg-gradient-to-r from-minero-naranja to-minero-rojo text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutationDevolver.isPending ? 'Procesando...' : 'Confirmar Devolución'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Vista de préstamo
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-minero-negro via-minero-carbono to-minero-negro p-4 overflow-y-auto z-50">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6 pt-8">
          <h1 className="text-3xl font-bold text-white mb-2">📤 Prestar Equipo</h1>
          <div className="h-1 w-24 bg-minero-naranja mx-auto rounded"></div>
        </div>

        {/* Información del equipo */}
        {equipo && (
          <div className="bg-minero-gris/30 rounded-xl p-4 mb-6 border border-minero-naranja/30">
            <p className="text-minero-naranja text-xl font-bold mb-1">{equipo.serie}</p>
            <p className="text-gray-300 text-sm">{equipo.tipo} {equipo.marca} {equipo.modelo}</p>
          </div>
        )}

        <form onSubmit={handleSubmitPrestar} className="space-y-4">
          {/* Selección de trabajador */}
          <div>
            <label className="block text-white font-medium mb-2">
              Seleccionar Trabajador <span className="text-red-500">*</span>
            </label>
            {loadingTrabajadores ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-minero-naranja mx-auto"></div>
              </div>
            ) : (
              <select
                value={trabajadorSeleccionado}
                onChange={(e) => setTrabajadorSeleccionado(e.target.value)}
                className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-minero-naranja"
                required
              >
                <option value="">Selecciona un trabajador...</option>
                {trabajadores.map((t) => (
                  <option key={t.rut} value={t.rut} className="bg-minero-gris">
                    {t.nombre} - {t.rut} {t.obra ? `(${t.obra})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Alertas del trabajador */}
          {trabajador && alertasTrabajador.length > 0 && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
              <p className="text-yellow-300 text-sm font-medium mb-1">⚠️ Alertas:</p>
              <ul className="text-yellow-200 text-xs space-y-1">
                {alertasTrabajador.map((alerta, idx) => (
                  <li key={idx}>• {alerta.mensaje}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Estado del equipo */}
          <div className="space-y-3">
            <label className="block text-white font-medium">Estado del equipo:</label>
            
            <label className="flex items-center gap-3 p-3 bg-minero-gris/30 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={estadoBueno}
                onChange={(e) => setEstadoBueno(e.target.checked)}
                className="w-5 h-5 rounded border-minero-naranja text-minero-naranja focus:ring-minero-naranja"
              />
              <span className="text-white">Equipo en buen estado</span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-minero-gris/30 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={conCargador}
                onChange={(e) => setConCargador(e.target.checked)}
                className="w-5 h-5 rounded border-minero-naranja text-minero-naranja focus:ring-minero-naranja"
              />
              <span className="text-white">Con cargador</span>
            </label>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-white font-medium mb-2">Observaciones (opcional):</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas sobre el préstamo..."
              className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-minero-naranja resize-none"
              rows={3}
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={mutationPrestar.isPending || !trabajadorSeleccionado}
            className="w-full py-4 bg-gradient-to-r from-minero-naranja to-minero-rojo text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutationPrestar.isPending ? 'Procesando...' : 'Confirmar Préstamo'}
          </button>
        </form>
      </div>
    </div>
  )
}

