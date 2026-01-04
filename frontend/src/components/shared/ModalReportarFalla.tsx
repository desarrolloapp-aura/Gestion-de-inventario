import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reportesService } from '../../services/reportes'

interface Props {
  equipoId: number
  onClose: () => void
}

export default function ModalReportarFalla({ equipoId, onClose }: Props) {
  const [problema, setProblema] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => reportesService.reportarFalla(equipoId, problema, foto || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipos'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card-minero w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">🚨 REPORTAR FALLA</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Problema</label>
            <textarea
              value={problema}
              onChange={(e) => setProblema(e.target.value)}
              className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg focus:outline-none focus:ring-2 focus:ring-minero-naranja"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Foto (opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFoto(e.target.files?.[0] || null)}
              className="w-full px-4 py-3 bg-minero-gris border border-minero-naranja rounded-lg"
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-minero-rojo flex-1">
              REPORTAR
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-minero-gris rounded-lg"
            >
              CANCELAR
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}





