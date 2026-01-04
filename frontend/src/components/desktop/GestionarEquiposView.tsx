import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { equiposService } from '../../services/equipos'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { exportToExcel } from '../../utils/excelExport'
import EquipoGrid from './EquipoGrid'
import ModalCrearEquipo from '../shared/ModalCrearEquipo'
import ModalEditarEquipo from '../shared/ModalEditarEquipo'
import ModalPrestar from '../shared/ModalPrestar'
import ModalDevolver from '../shared/ModalDevolver'

export default function GestionarEquiposView() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [busqueda, setBusqueda] = useState<string>('')
  const [showCrearEquipoModal, setShowCrearEquipoModal] = useState(false)
  const [showEditarEquipoModal, setShowEditarEquipoModal] = useState(false)
  const [showPrestarModal, setShowPrestarModal] = useState(false)
  const [showDevolverModal, setShowDevolverModal] = useState(false)
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<number | null>(null)

  const { data: equipos, isLoading } = useQuery({
    queryKey: ['equipos', busqueda],
    queryFn: () =>
      equiposService.getAll({
        busqueda: busqueda || undefined,
      }),
  })

  const handlePrestar = (equipoId: number) => {
    setEquipoSeleccionado(equipoId)
    setShowPrestarModal(true)
  }

  const handleEditar = (equipoId: number) => {
    setEquipoSeleccionado(equipoId)
    setShowEditarEquipoModal(true)
  }

  const deleteEquipoMutation = useMutation({
    mutationFn: (equipoId: number) => equiposService.delete(equipoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipos'] })
      queryClient.invalidateQueries({ queryKey: ['alertas'] })
    },
  })

  const handleEliminar = async (equipoId: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este equipo?')) {
      deleteEquipoMutation.mutate(equipoId, {
        onSuccess: () => {
          showToast('Equipo eliminado exitosamente', 'success')
        },
        onError: (err: any) => {
          showToast(err.response?.data?.detail || 'Error al eliminar equipo', 'error')
        },
      })
    }
  }

  const handleDevolver = (equipoId: number) => {
    setEquipoSeleccionado(equipoId)
    setShowDevolverModal(true)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Equipos</h1>
          <p className="text-gray-400">Gestiona todos los equipos del sistema</p>
        </div>
        <div className="flex gap-3">
          {equipos && equipos.length > 0 && (
            <button
              onClick={() => {
                const datosExport = equipos.map(e => ({
                  Serie: e.serie,
                  Tipo: e.tipo,
                  Marca: e.marca,
                  Modelo: e.modelo,
                  Estado: e.estado_dispositivo,
                  RAM: e.ram_gb || '',
                  SSD: e.ssd_gb || '',
                  SO: e.so || '',
                  'Prestado a': e.prestamo_activo?.trabajador?.nombre || 'Disponible',
                  'Obra': e.prestamo_activo?.trabajador?.obra || '',
                }))
                exportToExcel(datosExport, 'equipos')
                showToast('Reporte exportado exitosamente', 'success')
              }}
              className="inline-flex items-center justify-center rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 font-medium px-4 py-2.5 transition-all duration-200 hover:scale-105 active:scale-95 border border-green-600/30"
            >
              📊 Exportar Excel
            </button>
          )}
          {user?.rol === 'INFORMATICA' && (
            <button
              onClick={() => setShowCrearEquipoModal(true)}
              className="inline-flex items-center justify-center rounded-lg bg-minero-naranja hover:bg-minero-naranja-oscuro text-white font-medium px-6 py-2.5 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-minero-naranja/20"
            >
              <span className="mr-2">➕</span>
              Crear Equipo
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por serie o nombre (tipo/marca/modelo)..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="px-4 py-2 bg-minero-gris border border-minero-naranja rounded-lg flex-1 min-w-[200px]"
        />
      </div>

      {/* Grid de equipos */}
      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-minero-naranja">Cargando equipos...</p>
        </div>
      ) : (
        <EquipoGrid 
          equipos={equipos || []} 
          onPrestar={handlePrestar}
          onDevolver={undefined}
          onEditar={user?.rol === 'INFORMATICA' ? handleEditar : undefined}
          onEliminar={user?.rol === 'INFORMATICA' ? handleEliminar : undefined}
          showDescargarQR={true}
          showDevolverButton={false}
        />
      )}

      {/* Modales */}
      {showPrestarModal && equipoSeleccionado && (
        <ModalPrestar
          equipoId={equipoSeleccionado}
          onClose={() => {
            setShowPrestarModal(false)
            setEquipoSeleccionado(null)
          }}
        />
      )}

      {showCrearEquipoModal && (
        <ModalCrearEquipo
          onClose={() => setShowCrearEquipoModal(false)}
        />
      )}

      {showEditarEquipoModal && equipoSeleccionado && (
        <ModalEditarEquipo
          equipoId={equipoSeleccionado}
          onClose={() => {
            setShowEditarEquipoModal(false)
            setEquipoSeleccionado(null)
          }}
        />
      )}

      {showDevolverModal && equipoSeleccionado && (
        <ModalDevolver
          equipoId={equipoSeleccionado}
          onClose={() => {
            setShowDevolverModal(false)
            setEquipoSeleccionado(null)
          }}
        />
      )}
    </div>
  )
}

