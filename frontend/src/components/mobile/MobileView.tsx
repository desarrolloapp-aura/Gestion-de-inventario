import { useQuery } from '@tanstack/react-query'
import { equiposService } from '../../services/equipos'
import { useAuth } from '../../context/AuthContext'
import EquipoCard from './EquipoCard'
import { useState } from 'react'
import ModalReportarFalla from '../shared/ModalReportarFalla'
import ModalDevolver from '../shared/ModalDevolver'

export default function MobileView() {
  const { user } = useAuth()
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<number | null>(null)
  const [showFallaModal, setShowFallaModal] = useState(false)
  const [showDevolverModal, setShowDevolverModal] = useState(false)

  const { data: equipos, isLoading } = useQuery({
    queryKey: ['equipos', user?.obra],
    queryFn: () => equiposService.getAll({ obra: user?.obra }),
  })

  const handleReportarFalla = (id: number) => {
    setEquipoSeleccionado(id)
    setShowFallaModal(true)
  }

  const handleDevolver = (id: number) => {
    setEquipoSeleccionado(id)
    setShowDevolverModal(true)
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <p className="text-minero-naranja">Cargando equipos...</p>
      </div>
    )
  }

  if (!equipos || equipos.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-400">No hay equipos asignados a tu obra</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      {equipos.map((equipo) => (
        <EquipoCard
          key={equipo.id}
          equipo={equipo}
          onReportarFalla={handleReportarFalla}
          onDevolver={handleDevolver}
        />
      ))}

      {showFallaModal && equipoSeleccionado && (
        <ModalReportarFalla
          equipoId={equipoSeleccionado}
          onClose={() => {
            setShowFallaModal(false)
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





