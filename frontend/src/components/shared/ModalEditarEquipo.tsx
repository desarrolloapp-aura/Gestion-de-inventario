import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { equiposService } from '../../services/equipos'
import { configService } from '../../services/config'
import { useToast } from '../../context/ToastContext'
import { EstadoDispositivo } from '../../types'

interface Props {
  equipoId: number
  onClose: () => void
}

export default function ModalEditarEquipo({ equipoId, onClose }: Props) {
  const { data: equipo, isLoading } = useQuery({
    queryKey: ['equipo', equipoId],
    queryFn: () => equiposService.getById(equipoId),
  })

  const [formData, setFormData] = useState({
    marca: '',
    modelo: '',
    tipo: '',
    estado_dispositivo: 'OPERATIVO' as EstadoDispositivo,
    ram_gb: '',
    ssd_gb: '',
    so: '',
    observaciones: '',
  })
  
  const [nuevoTipo, setNuevoTipo] = useState('')
  const [mostrarNuevoTipo, setMostrarNuevoTipo] = useState(false)
  
  // Obtener tipos de equipos dinámicamente
  const { data: tiposEquipos = [] } = useQuery({
    queryKey: ['tipos-equipos'],
    queryFn: () => configService.getTiposEquipos(),
  })

  const [error, setError] = useState('')

  const queryClient = useQueryClient()

  // Cargar datos del equipo cuando se obtenga
  useEffect(() => {
    if (equipo) {
      setFormData({
        marca: equipo.marca || '',
        modelo: equipo.modelo || '',
        tipo: equipo.tipo,
        estado_dispositivo: equipo.estado_dispositivo,
        ram_gb: equipo.ram_gb?.toString() || '',
        ssd_gb: equipo.ssd_gb?.toString() || '',
        so: equipo.so || '',
        observaciones: equipo.observaciones || '',
      })
    }
  }, [equipo])

  const mutation = useMutation({
    mutationFn: () => {
      const equipoData = {
        ...formData,
        tipo: mostrarNuevoTipo && nuevoTipo ? nuevoTipo : formData.tipo,
        ram_gb: formData.ram_gb ? parseInt(formData.ram_gb) : undefined,
        ssd_gb: formData.ssd_gb ? parseInt(formData.ssd_gb) : undefined,
        observaciones: formData.observaciones || undefined,
        so: formData.so || undefined,
      }
      return equiposService.update(equipoId, equipoData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipos'] })
      queryClient.invalidateQueries({ queryKey: ['equipo', equipoId] })
      queryClient.invalidateQueries({ queryKey: ['tipos-equipos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      showToast('Equipo actualizado exitosamente', 'success')
      onClose()
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.detail || 'Error al actualizar equipo'
      setError(errorMsg)
      showToast(errorMsg, 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    const tipoFinal = mostrarNuevoTipo && nuevoTipo ? nuevoTipo : formData.tipo
    
    if (!formData.marca || !formData.modelo || !tipoFinal) {
      setError('Marca, modelo y tipo son obligatorios')
      return
    }

    mutation.mutate()
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="card-minero">
          <p className="text-minero-naranja">Cargando equipo...</p>
        </div>
      </div>
    )
  }

  if (!equipo) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="card-minero w-full max-w-2xl my-8">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">✏️ EDITAR EQUIPO</h2>
          <p className="serie-monospace text-minero-naranja text-xl mt-2">
            Serie: {equipo.serie}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fila 1: Tipo y Estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Tipo <span className="text-minero-rojo">*</span>
              </label>
              {!mostrarNuevoTipo ? (
                <>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
                    required
                  >
                    <option value="">Seleccionar tipo</option>
                    {tiposEquipos.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setMostrarNuevoTipo(true)}
                    className="mt-2 text-sm text-minero-naranja hover:underline"
                  >
                    + Crear nuevo tipo
                  </button>
                </>
              ) : (
                <div>
                  <input
                    type="text"
                    value={nuevoTipo}
                    onChange={(e) => setNuevoTipo(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
                    placeholder="Escribe el nuevo tipo (ej: TABLET, SERVIDOR)"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarNuevoTipo(false)
                      setNuevoTipo('')
                    }}
                    className="mt-2 text-sm text-gray-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Estado <span className="text-minero-rojo">*</span>
              </label>
              <select
                name="estado_dispositivo"
                value={formData.estado_dispositivo}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
                required
              >
                <option value="OPERATIVO">OPERATIVO</option>
                <option value="MANTENCIÓN">MANTENCIÓN</option>
                <option value="BAJA">BAJA</option>
              </select>
            </div>
          </div>

          {/* Fila 2: Marca y Modelo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Marca <span className="text-minero-rojo">*</span>
              </label>
              <input
                type="text"
                name="marca"
                value={formData.marca}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Modelo <span className="text-minero-rojo">*</span>
              </label>
              <input
                type="text"
                name="modelo"
                value={formData.modelo}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
                required
              />
            </div>
          </div>

          {/* Fila 3: RAM, SSD, SO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">RAM (GB)</label>
              <input
                type="number"
                name="ram_gb"
                value={formData.ram_gb}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">SSD (GB)</label>
              <input
                type="number"
                name="ssd_gb"
                value={formData.ssd_gb}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Sistema Operativo</label>
              <input
                type="text"
                name="so"
                value={formData.so}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
              />
            </div>
          </div>


          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium mb-2">Observaciones</label>
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
              rows={3}
            />
          </div>

          {error && (
            <div className="alerta-urgente text-center">{error}</div>
          )}

          {/* Botones */}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="btn-minero flex-1"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Guardando...' : 'GUARDAR CAMBIOS'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-4 bg-minero-gris border border-minero-naranja rounded-lg font-bold text-lg hover:bg-minero-gris/80"
            >
              CANCELAR
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}




