import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { equiposService } from '../../services/equipos'
import { useAuth } from '../../context/AuthContext'
import ModalPrestar from './ModalPrestar'
import ModalDevolver from './ModalDevolver'
import { useToast } from '../../context/ToastContext'
import PrestamoMovilView from './PrestamoMovilView'

export default function QRScannerView() {
  const { equipoId } = useParams<{ equipoId: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [equipoInfo, setEquipoInfo] = useState<any>(null)
  const [showPrestarModal, setShowPrestarModal] = useState(false)
  const [showDevolverModal, setShowDevolverModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Detectar si es móvil - SIEMPRE mostrar vista móvil cuando se accede desde QR
  useEffect(() => {
    // Si estamos en la ruta /qr/equipo, SIEMPRE usar vista móvil (sin menús)
    setIsMobile(true)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      showToast('Debes iniciar sesión para usar esta función', 'error')
      // Guardar la URL para redirigir después del login
      const currentPath = `/qr/equipo/${equipoId}`
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`)
      return
    }

    const cargarInfoEquipo = async () => {
      try {
        // Obtener información del equipo desde el endpoint QR
        // Este endpoint siempre devuelve el estado actualizado
        const info = await equiposService.obtenerInfoQR(Number(equipoId))
        setEquipoInfo(info)
        
        console.log('[QR] Información del equipo:', info)
        console.log('[QR] ¿Está prestado?', info.prestado)
        
        // No necesitamos abrir modales aquí, PrestamoMovilView se encargará
        // basándose en la información del equipo
      } catch (error: any) {
        showToast(error.response?.data?.detail || 'Error al cargar información del equipo', 'error')
        navigate('/equipos')
      } finally {
        setLoading(false)
      }
    }

    if (equipoId && isAuthenticated) {
      cargarInfoEquipo()
    }
  }, [equipoId, isAuthenticated, navigate, showToast])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-minero-negro via-minero-carbono to-minero-negro flex items-center justify-center p-4 z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-minero-naranja mx-auto mb-4"></div>
          <p className="text-white">Cargando información del equipo...</p>
        </div>
      </div>
    )
  }

  // SIEMPRE mostrar vista móvil cuando se accede desde QR (sin menús, sin sidebar)
  // isPrestado se determina desde equipoInfo que viene del endpoint QR
  const estaPrestado = equipoInfo?.prestado === true
  
  return (
    <PrestamoMovilView
      equipoId={Number(equipoId)}
      equipoInfo={equipoInfo}
      isPrestado={estaPrestado}
      onClose={() => {
        // Mostrar mensaje de éxito
        if (equipoInfo?.prestado) {
          showToast('Devolución completada', 'success')
        } else {
          showToast('Préstamo completado', 'success')
        }
        // Intentar cerrar la ventana o redirigir después de un momento
        setTimeout(() => {
          // Intentar cerrar la ventana (solo funciona si fue abierta por script)
          if (window.opener) {
            window.close()
          } else {
            // Si no se puede cerrar, mostrar mensaje y mantener en la misma página
            // El usuario puede cerrar manualmente
          }
        }, 2000)
      }}
    />
  )
}

