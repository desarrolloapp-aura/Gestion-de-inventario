import { useState } from 'react'
import AsistenteVirtual from './AsistenteVirtual'

export default function AsistenteFloating() {
  const [showAsistente, setShowAsistente] = useState(false)

  return (
    <>
      {/* Botón flotante - Fixed para que no genere espacio */}
      <button
        onClick={() => setShowAsistente(!showAsistente)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-white/20 z-50"
        title={showAsistente ? "Cerrar Asistente Virtual" : "Abrir Asistente Virtual"}
        style={{
          overscrollBehavior: 'none',
          pointerEvents: 'auto'
        }}
        onMouseEnter={(e) => {
          e.stopPropagation()
        }}
      >
        🤖
      </button>

      {/* Widget flotante del asistente - Fixed para que no genere espacio */}
      {showAsistente && (
        <div 
          className="fixed bottom-24 right-6 z-50"
          style={{
            overscrollBehavior: 'none',
            pointerEvents: 'auto'
          }}
          onMouseEnter={(e) => {
            e.stopPropagation()
          }}
          onWheel={(e) => {
            e.stopPropagation()
          }}
        >
          <div 
            className="w-96 h-[600px] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-gray-700/50 bg-gray-900"
            style={{
              overscrollBehavior: 'none',
              contain: 'layout style paint'
            }}
            onMouseEnter={(e) => {
              e.stopPropagation()
            }}
            onWheel={(e) => {
              e.stopPropagation()
            }}
          >
            <AsistenteVirtual onClose={() => setShowAsistente(false)} />
          </div>
        </div>
      )}
    </>
  )
}


