import { Alerta } from '../../types'

interface Props {
  alertas: Alerta[]
}

export default function AlertasPanel({ alertas }: Props) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold mb-4">🚨 ALERTAS URGENTES</h2>
      <div className="space-y-2">
        {alertas.map((alerta, idx) => (
          <div key={idx} className="alerta-urgente">
            {alerta.mensaje}
          </div>
        ))}
      </div>
    </div>
  )
}





