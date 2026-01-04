import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { equiposService } from '../../services/equipos'
import { configService } from '../../services/config'
import { useToast } from '../../context/ToastContext'
import { EstadoDispositivo } from '../../types'

interface Props {
  onClose: () => void
}

export default function ModalCrearEquipo({ onClose }: Props) {
  const [formData, setFormData] = useState({
    serie: '',
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

  const mutation = useMutation({
    mutationFn: () => {
      // Determinar el tipo final a usar
      let tipoFinal = ''
      if (mostrarNuevoTipo && nuevoTipo && nuevoTipo.trim()) {
        tipoFinal = nuevoTipo.trim().toUpperCase()
      } else if (formData.tipo && formData.tipo.trim()) {
        tipoFinal = formData.tipo.trim().toUpperCase()
      } else {
        throw new Error('El tipo de equipo es requerido')
      }
      
      const equipoData = {
        serie: formData.serie.trim().toUpperCase(),
        marca: formData.marca.trim(),
        modelo: formData.modelo.trim(),
        tipo: tipoFinal,
        estado_dispositivo: formData.estado_dispositivo,
        ram_gb: formData.ram_gb ? parseInt(formData.ram_gb) : undefined,
        ssd_gb: formData.ssd_gb ? parseInt(formData.ssd_gb) : undefined,
        observaciones: formData.observaciones?.trim() || undefined,
        so: formData.so?.trim() || undefined,
      }
      
      console.log('Enviando equipo:', equipoData)
      return equiposService.create(equipoData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipos'] })
      queryClient.invalidateQueries({ queryKey: ['tipos-equipos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      showToast('Equipo creado exitosamente', 'success')
      onClose()
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.detail || 'Error al crear equipo'
      setError(errorMsg)
      showToast(errorMsg, 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    const tipoFinal = mostrarNuevoTipo && nuevoTipo 
      ? nuevoTipo.trim().toUpperCase() 
      : (formData.tipo?.trim().toUpperCase() || '')
    
    if (!formData.serie?.trim() || !formData.marca?.trim() || !formData.modelo?.trim() || !tipoFinal) {
      setError('Serie, marca, modelo y tipo son obligatorios')
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="card-minero w-full max-w-2xl my-8">
        <h2 className="text-2xl font-bold mb-6">➕ CREAR NUEVO EQUIPO</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fila 1: Serie y Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Serie <span className="text-minero-rojo">*</span>
              </label>
              <input
                type="text"
                name="serie"
                value={formData.serie}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
                placeholder="5CD5033D0T"
                required
              />
            </div>

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
                placeholder="HP"
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
                placeholder="Probook 440 G10"
                required
              />
            </div>
          </div>

          {/* Fila 3: Estado, RAM, SSD */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div>
              <label className="block text-sm font-medium mb-2">RAM (GB)</label>
              <input
                type="number"
                name="ram_gb"
                value={formData.ram_gb}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
                placeholder="16"
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
                placeholder="512"
                min="0"
              />
            </div>
          </div>

          {/* Fila 4: SO */}
          <div>
            <label className="block text-sm font-medium mb-2">Sistema Operativo</label>
            <input
              type="text"
              name="so"
              value={formData.so}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
              placeholder="Windows 11 Pro"
            />
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
              placeholder="Notas adicionales sobre el equipo..."
            />
          </div>

          {error && (
            <div className="p-4 bg-red-600/20 border border-red-600/50 rounded-lg">
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center rounded-lg bg-minero-naranja hover:bg-minero-naranja-oscuro text-white font-medium px-6 py-2.5 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-minero-naranja/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? '⏳ Creando...' : 'Crear Equipo'}
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

