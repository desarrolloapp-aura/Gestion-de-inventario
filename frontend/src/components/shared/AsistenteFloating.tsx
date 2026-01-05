import { useState } from 'react'
import AsistenteVirtual from './AsistenteVirtual'

export default function AsistenteFloating() {
  const [showAsistente, setShowAsistente] = useState(false)

  return (
    <div className="sticky bottom-6 z-50 flex justify-end pr-6 mt-auto" style={{ alignSelf: 'flex-end' }}>
      {/* Botón flotante - Se mueve con el scroll del contenido, se mantiene visible con sticky */}
      <button
        onClick={() => setShowAsistente(!showAsistente)}
        className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-white/20"
        title={showAsistente ? "Cerrar Asistente Virtual" : "Abrir Asistente Virtual"}
      >
        🤖
      </button>

      {/* Widget flotante del asistente - Aparece cuando está abierto, también se mueve con sticky */}
      {showAsistente && (
        <div className="absolute bottom-20 right-0 w-96 h-[600px] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-gray-700/50 bg-gray-900">
          <AsistenteVirtual onClose={() => setShowAsistente(false)} />
        </div>
      )}
    </div>
  )
}


