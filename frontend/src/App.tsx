import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ToastContainer from './components/shared/ToastContainer'
import Login from './components/auth/Login'
import Header from './components/shared/Header'
import Sidebar from './components/shared/Sidebar'
import MobileView from './components/mobile/MobileView'
import DesktopView from './components/desktop/DesktopView'
import GestionarEquiposView from './components/desktop/GestionarEquiposView'
import GestionarObrasView from './components/desktop/GestionarObrasView'
import TrabajadoresView from './components/desktop/TrabajadoresView'
import AjustesView from './components/desktop/AjustesView'
import QRScannerView from './components/shared/QRScannerView'
import AsistenteFloating from './components/shared/AsistenteFloating'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  
  if (!isAuthenticated) {
    // Si viene de una ruta QR, mantener el redirect
    const redirectPath = location.pathname.startsWith('/qr/') ? location.pathname + location.search : undefined
    return <Navigate to={redirectPath ? `/login?redirect=${encodeURIComponent(redirectPath)}` : '/login'} replace />
  }
  
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gray-900/60 backdrop-blur-md flex relative">
              {/* Sidebar - Solo para INFORMATICA y RRHH */}
              <Sidebar />
              
              {/* Contenido principal */}
              <div className="flex-1 flex flex-col relative z-0">
                <Header />
                {user?.rol === 'JEFE_OBRA' ? (
                  <div className="md:hidden flex-1 overflow-y-auto relative">
                    <MobileView />
                  </div>
                ) : (
                  <div className="hidden md:block flex-1 overflow-y-auto relative">
                    <DesktopView />
                  </div>
                )}
                {/* Asistente flotante */}
                <AsistenteFloating />
              </div>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipos"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gray-900/60 backdrop-blur-md flex relative">
              <Sidebar />
              <div className="flex-1 flex flex-col">
                <Header />
                <div className="flex-1 overflow-y-auto relative">
                  <GestionarEquiposView />
                </div>
                <AsistenteFloating />
              </div>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/obras"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gray-900/60 backdrop-blur-md flex relative">
              <Sidebar />
              <div className="flex-1 flex flex-col relative z-0">
                <Header />
                <div className="flex-1 overflow-y-auto relative">
                  <GestionarObrasView />
                </div>
                <AsistenteFloating />
              </div>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trabajadores"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gray-900/60 backdrop-blur-md flex relative">
              <Sidebar />
              <div className="flex-1 flex flex-col relative z-0">
                <Header />
                <div className="flex-1 overflow-y-auto relative">
                  <TrabajadoresView />
                </div>
                <AsistenteFloating />
              </div>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ajustes"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gray-900/60 backdrop-blur-md flex relative">
              <Sidebar />
              <div className="flex-1 flex flex-col relative z-0">
                <Header />
                <div className="flex-1 overflow-y-auto relative">
                  <AjustesView />
                </div>
                <AsistenteFloating />
              </div>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/qr/equipo/:equipoId"
        element={
          <ProtectedRoute>
            {/* Vista QR sin Header ni Sidebar - solo para préstamo/devolución */}
            <QRScannerView />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

