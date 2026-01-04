import { useState, useRef, useEffect } from 'react'
import { asistenteService, MensajeHistorial } from '../../services/asistente'

interface Props {
  onClose: () => void
}

interface Mensaje {
  tipo: 'usuario' | 'asistente'
  texto: string
  sugerencias?: string[]
}

export default function AsistenteVirtual({ onClose }: Props) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      tipo: 'asistente',
      texto: '¡Hola! Soy tu asistente virtual. Puedo ayudarte a consultar equipos, trabajadores, préstamos y más. ¿En qué puedo ayudarte?',
      sugerencias: [
        '¿Qué equipos están disponibles?',
        '¿Cuántos préstamos activos hay?',
        'Ver estadísticas del sistema'
      ]
    }
  ])
  const [inputMensaje, setInputMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const mensajesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const enviarMensaje = async (texto?: string) => {
    const mensajeTexto = texto || inputMensaje.trim()
    if (!mensajeTexto || cargando) return

    // Agregar mensaje del usuario
    setMensajes(prev => [...prev, { tipo: 'usuario', texto: mensajeTexto }])
    setInputMensaje('')
    setCargando(true)

    try {
      // Preparar historial (excluyendo el mensaje de bienvenida inicial y el mensaje actual que acabamos de agregar)
      const historial = mensajes
        .filter(m => m.tipo !== 'asistente' || !m.texto.includes('¡Hola! Soy tu asistente'))
        .map(m => ({
          tipo: m.tipo === 'usuario' ? 'usuario' as const : 'asistente' as const,
          texto: m.texto
        }))
      
      // Agregar el mensaje actual del usuario al historial
      historial.push({
        tipo: 'usuario',
        texto: mensajeTexto
      })

      const respuesta = await asistenteService.chat(mensajeTexto, historial)
      
      setMensajes(prev => [...prev, {
        tipo: 'asistente',
        texto: respuesta.respuesta,
        sugerencias: respuesta.sugerencias
      }])
    } catch (error) {
      setMensajes(prev => [...prev, {
        tipo: 'asistente',
        texto: 'Lo siento, hubo un error al procesar tu consulta. Por favor intenta de nuevo.'
      }])
    } finally {
      setCargando(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarMensaje()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl">
                🤖
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Asistente Virtual</h2>
                <p className="text-sm text-gray-400">Pregúntame lo que necesites</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {mensajes.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.tipo === 'usuario' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.tipo === 'usuario'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                <p className="whitespace-pre-line text-sm">{msg.texto}</p>
                
                {msg.sugerencias && msg.sugerencias.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.sugerencias.map((sug, sugIdx) => (
                      <button
                        key={sugIdx}
                        onClick={() => enviarMensaje(sug)}
                        className="block w-full text-left px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {cargando && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={mensajesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputMensaje}
              onChange={(e) => setInputMensaje(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu pregunta..."
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={cargando}
            />
            <button
              onClick={() => enviarMensaje()}
              disabled={!inputMensaje.trim() || cargando}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

