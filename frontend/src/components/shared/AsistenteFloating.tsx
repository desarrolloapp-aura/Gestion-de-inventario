import { useState } from 'react'
import AsistenteVirtual from './AsistenteVirtual'

export default function AsistenteFloating() {
  const [showAsistente, setShowAsistente] = useState(false)

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setShowAsistente(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl transition-all duration-300 hover:scale-110 active:scale-95 z-50 border-2 border-white/20"
        title="Asistente Virtual"
      >
        🤖
      </button>

      {/* Modal del asistente */}
      {showAsistente && (
        <AsistenteVirtual onClose={() => setShowAsistente(false)} />
      )}
    </>
  )
}


