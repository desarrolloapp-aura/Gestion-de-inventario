import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { configService } from '../../services/config'

export default function GestionarObrasView() {
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Obras</h1>
        <p className="text-gray-400">Gestiona las obras del sistema</p>
      </div>

      {/* Formulario para crear obra */}
      <div className="mb-8 bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Crear Nueva Obra</h2>
        <form onSubmit={handleCreate} className="flex gap-4">
          <input
            type="text"
            value={nuevaObra}
            onChange={(e) => {
              setNuevaObra(e.target.value)
              setError('')
            }}
            placeholder="Nombre de la nueva obra"
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja text-white"
            required
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-minero-naranja hover:bg-minero-naranja-oscuro text-white font-medium px-6 py-2.5 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-minero-naranja/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? '⏳ Creando...' : '➕ Crear'}
          </button>
        </form>
        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}
      </div>

      {/* Lista de obras */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-white">Obras Existentes</h2>
        {obras.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
            <p className="text-gray-400">No hay obras creadas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {obras.map((obra) => (
              <div
                key={obra}
                className="flex items-center justify-between p-4 bg-gradient-to-br from-gray-800 via-gray-800/90 to-gray-900 rounded-lg border border-gray-700/50 hover:border-minero-naranja/50 hover:shadow-xl hover:shadow-minero-naranja/20 transition-all duration-200 backdrop-blur-sm"
              >
                <span className="font-medium text-white">{obra}</span>
                <button
                  onClick={() => handleDelete(obra)}
                  className="ml-4 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-colors border border-red-600/30"
                  disabled={deleteMutation.isPending}
                >
                  🗑️ Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


