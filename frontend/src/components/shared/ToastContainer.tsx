import { useToast } from '../../context/ToastContext'
import { useEffect } from 'react'

export default function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            relative px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm
            animate-in slide-in-from-right-full duration-300
            ${toast.type === 'success' 
              ? 'bg-green-500/90 border-green-400 text-white' 
              : toast.type === 'error'
              ? 'bg-red-500/90 border-red-400 text-white'
              : toast.type === 'warning'
              ? 'bg-yellow-500/90 border-yellow-400 text-white'
              : 'bg-blue-500/90 border-blue-400 text-white'
            }
          `}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/80 hover:text-white transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}


