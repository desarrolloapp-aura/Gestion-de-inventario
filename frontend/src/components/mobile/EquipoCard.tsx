import { EquipoConPrestamo } from '../../types'
import { format, differenceInDays } from 'date-fns'
import { QRCodeSVG } from 'qrcode.react'

interface Props {
  equipo: EquipoConPrestamo
  onReportarFalla: (id: number) => void
  onDevolver: (id: number) => void
}

export default function EquipoCard({ equipo, onReportarFalla, onDevolver }: Props) {
  const prestamo = equipo.prestamo_activo
  const diasRestantes = prestamo
    ? differenceInDays(new Date(prestamo.fecha_vencimiento), new Date())
    : null

  const isUrgente = diasRestantes !== null && diasRestantes < 3
  const isVencido = diasRestantes !== null && diasRestantes < 0

  return (
    <div className="card-minero mb-4">

      {/* Información principal */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">
          {equipo.tipo} {equipo.marca} {equipo.modelo}
        </h2>
        <p className="serie-monospace text-minero-naranja mb-2">
          Serie: {equipo.serie}
        </p>
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-bold ${
              equipo.estado_dispositivo === 'OPERATIVO'
                ? 'bg-green-600'
                : equipo.estado_dispositivo === 'MANTENCIÓN'
                ? 'bg-yellow-600'
                : 'bg-red-600'
            }`}
          >
            {equipo.estado_dispositivo}
          </span>
          {prestamo && (
            <span className="text-sm text-gray-400">
              {prestamo.trabajador.obra}
            </span>
          )}
        </div>

        {/* Información de préstamo */}
        {prestamo && (
          <div className="mt-4 p-3 bg-minero-gris rounded-lg">
            <p className="text-sm">
              <strong>Trabajador:</strong> {prestamo.trabajador.nombre}
            </p>
            <p className="text-sm">
              <strong>Vence:</strong>{' '}
              {format(new Date(prestamo.fecha_vencimiento), 'dd/MM/yyyy')}
            </p>
            {diasRestantes !== null && (
              <p
                className={`text-lg font-bold mt-2 ${
                  isVencido
                    ? 'text-minero-rojo'
                    : isUrgente
                    ? 'text-yellow-400'
                    : 'text-green-400'
                }`}
              >
                {isVencido
                  ? `VENCIDO hace ${Math.abs(diasRestantes)} días`
                  : `${diasRestantes} días restantes`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="space-y-2">
        <button
          onClick={() => onDevolver(equipo.id)}
          className="btn-minero-rojo w-full flex items-center justify-center gap-2"
        >
          <span>📷</span>
          <span>QR DEVOLVER</span>
        </button>
        <button
          onClick={() => onReportarFalla(equipo.id)}
          className="btn-minero-rojo w-full flex items-center justify-center gap-2"
        >
          <span>🚨</span>
          <span>REPORTAR FALLA</span>
        </button>
      </div>

      {/* QR Code para devolución */}
      {prestamo && (
        <div className="mt-4 p-4 bg-minero-gris rounded-lg text-center">
          <p className="text-sm mb-2">Código QR para devolución:</p>
          <div className="flex justify-center">
            <QRCodeSVG
              value={`${window.location.origin}/devolver/${prestamo.id}`}
              size={150}
              bgColor="#1A1A1A"
              fgColor="#FF6B35"
            />
          </div>
        </div>
      )}
    </div>
  )
}

