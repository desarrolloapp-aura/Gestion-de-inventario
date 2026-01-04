import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { configService } from '../../services/config'

interface Props {
  onClose: () => void
}

export default function ModalGestionarObras({ onClose }: Props) {
  const [nuevaObra, setNuevaObra] = useState('')
  const [error, setError] = useState('')
  
  const queryClient = useQueryClient()
  
  const { data: obras = [] } = useQuery({
    queryKey: ['obras'],
    queryFn: () => configService.getObras(),
  })

  const createMutation = useMutation({
    mutationFn: (nombre: string) => configService.createObra(nombre),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] })
      setNuevaObra('')
      setError('')
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Error al crear la obra')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (nombre: string) => configService.deleteObra(nombre),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] })
      queryClient.invalidateQueries({ queryKey: ['equipos'] })
      queryClient.invalidateQueries({ queryKey: ['trabajadores'] })
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Error al eliminar la obra')
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!nuevaObra.trim()) {
      setError('El nombre de la obra es requerido')
      return
    }

    createMutation.mutate(nuevaObra.trim())
  }

  const handleDelete = (nombre: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la obra "${nombre}"?`)) {
      deleteMutation.mutate(nombre)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="card-minero w-full max-w-2xl my-8">
        <h2 className="text-2xl font-bold mb-6">GESTIONAR OBRAS</h2>

        {/* Formulario para crear obra */}
        <form onSubmit={handleCreate} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={nuevaObra}
              onChange={(e) => {
                setNuevaObra(e.target.value)
                setError('')
              }}
              placeholder="Nombre de la nueva obra"
              className="flex-1 px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
              required
            />
            <button
              type="submit"
              className="btn-minero px-6"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creando...' : '➕ CREAR'}
            </button>
          </div>
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
        </form>

        {/* Lista de obras */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold mb-4">Obras existentes:</h3>
          {obras.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No hay obras creadas</p>
          ) : (
            obras.map((obra) => (
              <div
                key={obra}
                className="flex items-center justify-between p-4 bg-minero-gris rounded-lg border border-minero-naranja/30"
              >
                <span className="font-medium">{obra}</span>
                <button
                  onClick={() => handleDelete(obra)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  disabled={deleteMutation.isPending}
                >
                  🗑️ ELIMINAR
                </button>
              </div>
            ))
          )}
        </div>

        {/* Botón cerrar */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-minero-gris border border-minero-naranja rounded-lg hover:bg-minero-gris/80"
          >
            CERRAR
          </button>
        </div>
      </div>
    </div>
  )
}


