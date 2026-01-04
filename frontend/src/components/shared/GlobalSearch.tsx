import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { equiposService } from '../../services/equipos'
import { trabajadoresService } from '../../services/trabajadores'
import { prestamosService } from '../../services/prestamos'

interface Props {
  onClose: () => void
}

export default function GlobalSearch({ onClose }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const { data: equipos = [] } = useQuery({
    queryKey: ['equipos-search', searchTerm],
    queryFn: () => equiposService.getAll({ busqueda: searchTerm || undefined }),
    enabled: searchTerm.length >= 2,
  })

  const { data: trabajadores = [] } = useQuery({
    queryKey: ['trabajadores-search', searchTerm],
    queryFn: () => trabajadoresService.getAll({}),
    enabled: searchTerm.length >= 2,
  })

  const { data: prestamos = [] } = useQuery({
    queryKey: ['prestamos-search', searchTerm],
    queryFn: () => prestamosService.getAll({}),
    enabled: searchTerm.length >= 2,
  })

  // Filtrar resultados localmente
  const equiposFiltrados = equipos.filter(e => 
    e.serie.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.tipo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.modelo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const trabajadoresFiltrados = trabajadores.filter(t =>
    t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.rut.includes(searchTerm)
  )

  const prestamosFiltrados = prestamos.filter(p =>
    p.equipo.serie.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.trabajador.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.trabajador.rut.includes(searchTerm)
  )

  const hasResults = searchTerm.length >= 2 && (
    equiposFiltrados.length > 0 ||
    trabajadoresFiltrados.length > 0 ||
    prestamosFiltrados.length > 0
  )

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-start justify-center p-4 pt-20 z-[9999]" onClick={onClose}>
      <div className="bg-gray-900/95 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[70vh] overflow-hidden backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">🔍 Búsqueda Global</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar equipos, trabajadores, préstamos..."
            className="w-full px-4 py-4 bg-white border-2 border-minero-naranja rounded-lg text-gray-900 text-lg font-medium placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-minero-naranja focus:border-minero-naranja shadow-lg"
            autoFocus
            style={{ 
              color: '#111827',
              backgroundColor: '#ffffff',
              WebkitTextFillColor: '#111827'
            }}
          />
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-6">
          {searchTerm.length < 2 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Escribe al menos 2 caracteres para buscar</p>
            </div>
          ) : !hasResults ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No se encontraron resultados</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Equipos */}
              {equiposFiltrados.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">💻 Equipos ({equiposFiltrados.length})</h3>
                  <div className="space-y-2">
                    {equiposFiltrados.slice(0, 5).map((equipo) => (
                      <div key={equipo.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                        <p className="text-minero-naranja font-semibold">{equipo.serie}</p>
                        <p className="text-gray-300 text-sm">{equipo.tipo} {equipo.marca} {equipo.modelo}</p>
                        <p className="text-gray-500 text-xs mt-1">Estado: {equipo.estado_dispositivo}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trabajadores */}
              {trabajadoresFiltrados.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">👥 Trabajadores ({trabajadoresFiltrados.length})</h3>
                  <div className="space-y-2">
                    {trabajadoresFiltrados.slice(0, 5).map((trabajador) => (
                      <div key={trabajador.rut} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                        <p className="text-white font-semibold">{trabajador.nombre}</p>
                        <p className="text-gray-400 text-sm">RUT: {trabajador.rut} • {trabajador.obra}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Préstamos */}
              {prestamosFiltrados.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">📦 Préstamos ({prestamosFiltrados.length})</h3>
                  <div className="space-y-2">
                    {prestamosFiltrados.slice(0, 5).map((prestamo) => (
                      <div key={prestamo.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                        <p className="text-white font-semibold">{prestamo.equipo.serie}</p>
                        <p className="text-gray-400 text-sm">{prestamo.trabajador.nombre} • {prestamo.trabajador.obra}</p>
                        <p className="text-gray-500 text-xs mt-1">Estado: {prestamo.estado_prestamo}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

