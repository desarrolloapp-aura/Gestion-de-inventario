import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '../types'
import { authService } from '../services/auth'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
  }, [])

  const login = async (username: string, password: string) => {
    try {
      // Limpiar espacios en blanco de las credenciales
      const cleanUsername = username.trim()
      const cleanPassword = password.trim()
      
      console.log('[LOGIN FRONTEND] Enviando credenciales:', {
        username: cleanUsername,
        passwordLength: cleanPassword.length
      })
      
      const response = await authService.login({ username: cleanUsername, password: cleanPassword })
      
      // Guardar token primero
      const token = response.access_token
      setToken(token)
      localStorage.setItem('token', token)
      
      // Intentar obtener datos del usuario con el token recién guardado
      // Esperar un poco para asegurar que el interceptor tenga el token
      await new Promise(resolve => setTimeout(resolve, 50))
      
      try {
        const userData = await authService.getMe()
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
      } catch (getMeError: any) {
        console.error('Error al obtener datos del usuario, usando datos del login:', getMeError)
        // Si getMe falla, usar los datos que vienen en la respuesta del login
        // Necesitamos construir un objeto User básico
        const fallbackUser: User = {
          id: 0, // Se actualizará cuando getMe funcione
          username: username,
          email: '', // Se actualizará cuando getMe funcione
          rol: response.rol as RolUsuario,
          obra: response.obra || undefined
        }
        setUser(fallbackUser)
        localStorage.setItem('user', JSON.stringify(fallbackUser))
        // No lanzar error, el login fue exitoso aunque getMe falló
      }
    } catch (error) {
      console.error('Error en login:', error)
      // Limpiar token si el login falló completamente
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setToken(null)
      setUser(null)
      throw error
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    authService.logout()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}




