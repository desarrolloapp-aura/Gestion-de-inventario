import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { trabajadoresService } from '../../services/trabajadores'
import { configService } from '../../services/config'
import { useToast } from '../../context/ToastContext'

interface Props {
  onClose: () => void
}

export default function ModalCrearTrabajador({ onClose }: Props) {
  const [formData, setFormData] = useState({
    rut: '',
    nombre: '',
    obra: '',
    telefono: '',
    email: '',
  })
  const [error, setError] = useState<string>('')
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  // Obtener obras dinámicamente
  const { data: obras = [] } = useQuery({
    queryKey: ['obras'],
    queryFn: () => configService.getObras(),
  })

  const mutation = useMutation({
    mutationFn: () => trabajadoresService.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trabajadores'] })
      queryClient.invalidateQueries({ queryKey: ['equipos'] })
      queryClient.invalidateQueries({ queryKey: ['prestamos'] })
      onClose()
    },
    onError: (err: any) => {
      const errorMessage =
        err.response?.data?.detail || err.message || 'Error al crear el trabajador'
      setError(errorMessage)
    },
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!formData.rut || !formData.nombre || !formData.obra) {
      setError('RUT, nombre y obra son campos requeridos')
      return
    }

    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="card-minero w-full max-w-2xl my-8">
        <h2 className="text-2xl font-bold mb-6">👤 CREAR TRABAJADOR</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fila 1: RUT y Nombre */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                RUT <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="rut"
                value={formData.rut}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
                placeholder="12345678-9"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
                placeholder="Juan Pérez"
                required
              />
            </div>
          </div>

          {/* Fila 2: Obra */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Obra <span className="text-red-500">*</span>
            </label>
            <select
              name="obra"
              value={formData.obra}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
              required
            >
              <option value="">Seleccionar obra</option>
              {obras.map((obra) => (
                <option key={obra} value={obra}>
                  {obra}
                </option>
              ))}
            </select>
          </div>

          {/* Fila 3: Teléfono y Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Teléfono</label>
              <input
                type="text"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
                placeholder="+56 9 1234 5678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
                placeholder="juan.perez@ejemplo.com"
              />
            </div>
          </div>

          {/* Mostrar errores */}
          {error && (
            <div className="p-3 bg-red-600/20 border border-red-600/50 rounded-lg">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center rounded-lg bg-minero-naranja hover:bg-minero-naranja-oscuro text-white font-medium px-6 py-2.5 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-minero-naranja/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? '⏳ Creando...' : 'Crear Trabajador'}
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


