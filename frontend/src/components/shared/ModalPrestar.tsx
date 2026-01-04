import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { prestamosService } from '../../services/prestamos'
import { trabajadoresService } from '../../services/trabajadores'
import { equiposService } from '../../services/equipos'
import { useToast } from '../../context/ToastContext'
import { Trabajador } from '../../types'

interface Props {
  equipoId: number
  onClose: () => void
}

export default function ModalPrestar({ equipoId, onClose }: Props) {
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [estadoBueno, setEstadoBueno] = useState<boolean>(true)
  const [conCargador, setConCargador] = useState<boolean>(true)
  const [observaciones, setObservaciones] = useState<string>('')
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  // Obtener información del equipo
  const { data: equipo } = useQuery({
    queryKey: ['equipo', equipoId],
    queryFn: () => equiposService.getById(equipoId),
  })

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

  const mutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['equipos'] })
      queryClient.invalidateQueries({ queryKey: ['prestamos'] })
      queryClient.invalidateQueries({ queryKey: ['alertas'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      showToast('Préstamo creado exitosamente', 'success')
      onClose()
    },
    onError: (err: any) => {
      const errorMessage =
        err.response?.data?.detail || err.message || 'Error al crear el préstamo'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!trabajadorSeleccionado) {
      setError('Debes seleccionar un trabajador')
      return
    }

    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card-minero w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">📤 PRESTAR EQUIPO</h2>

        {/* Información del equipo */}
        {equipo && (
          <div className="mb-4 p-3 bg-minero-gris/50 rounded-lg">
            <p className="serie-monospace text-minero-naranja text-lg font-bold">
              {equipo.serie}
            </p>
            <p className="text-sm text-gray-400">
              {equipo.tipo} {equipo.marca} {equipo.modelo}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Seleccionar Trabajador <span className="text-red-500">*</span>
            </label>
            {loadingTrabajadores ? (
              <p className="text-gray-400">Cargando trabajadores...</p>
            ) : trabajadores.length === 0 ? (
              <div className="p-3 bg-yellow-600/20 border border-yellow-600/50 rounded-lg">
                <p className="text-sm text-yellow-200">
                  No hay trabajadores disponibles. Por favor crea uno desde el menú lateral.
                </p>
              </div>
            ) : (
              <select
                value={trabajadorSeleccionado}
                onChange={(e) => {
                  setTrabajadorSeleccionado(e.target.value)
                  setError('')
                }}
                className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
                required
              >
                <option value="">Seleccionar trabajador...</option>
                {trabajadores.map((t) => (
                  <option key={t.rut} value={t.rut}>
                    {t.nombre} ({t.rut}) - {t.obra}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Información del trabajador seleccionado */}
          {trabajador && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                <p className="text-sm font-semibold text-blue-200">Trabajador seleccionado:</p>
                <p className="text-sm text-gray-200">
                  <strong>{trabajador.nombre}</strong>
                </p>
                <p className="text-sm text-gray-300">RUT: {trabajador.rut}</p>
                <p className="text-sm text-gray-300">Obra: {trabajador.obra}</p>
              </div>

              {/* Alertas del trabajador */}
              {alertasTrabajador.length > 0 && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-sm font-semibold text-red-200 mb-2">
                    ⚠️ Alertas Pendientes:
                  </p>
                  <div className="space-y-2">
                    {alertasTrabajador.map((alerta: any, idx: number) => (
                      <div key={idx} className="text-xs text-gray-200 bg-gray-800/50 p-2 rounded">
                        <p className="font-semibold">{alerta.equipo_serie} - {alerta.equipo_tipo}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {alerta.problemas.map((problema: string, pIdx: number) => (
                            <span
                              key={pIdx}
                              className="px-2 py-0.5 bg-red-600/30 text-red-300 rounded text-xs"
                            >
                              {problema}
                            </span>
                          ))}
                        </div>
                        {alerta.observaciones && (
                          <p className="text-gray-400 mt-1">{alerta.observaciones}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-red-300 mt-2">
                    ⚠️ Este trabajador tiene problemas pendientes de devoluciones anteriores
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Verificación de estado del equipo al entregar */}
          <div className="space-y-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm font-semibold text-yellow-200 mb-3">
              ⚠️ Verificar estado del equipo al entregar:
            </p>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={estadoBueno}
                  onChange={(e) => setEstadoBueno(e.target.checked)}
                  className="w-4 h-4 text-minero-naranja bg-minero-gris border-gray-600 rounded focus:ring-minero-naranja"
                />
                <span className="text-sm text-gray-200">El equipo está en buen estado</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={conCargador}
                  onChange={(e) => setConCargador(e.target.checked)}
                  className="w-4 h-4 text-minero-naranja bg-minero-gris border-gray-600 rounded focus:ring-minero-naranja"
                />
                <span className="text-sm text-gray-200">El equipo incluye cargador</span>
              </label>
            </div>

            {(!estadoBueno || !conCargador) && (
              <div className="mt-3">
                <label className="block text-sm font-medium mb-2 text-gray-200">
                  Especificar qué no está bien:
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ej: Sin cargador, pantalla rayada, teclas faltantes..."
                  className="w-full px-3 py-2 bg-minero-gris border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-minero-naranja"
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Mostrar errores */}
          {error && (
            <div className="p-3 bg-red-600/20 border border-red-600/50 rounded-lg">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center rounded-lg bg-minero-naranja hover:bg-minero-naranja-oscuro text-white font-medium px-6 py-2.5 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-minero-naranja/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={mutation.isPending || !trabajadorSeleccionado}
            >
              {mutation.isPending ? '⏳ Prestando...' : 'Confirmar Préstamo'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-minero-gris border border-gray-600 rounded-lg hover:bg-minero-gris/80"
              disabled={mutation.isPending}
            >
              CANCELAR
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}




