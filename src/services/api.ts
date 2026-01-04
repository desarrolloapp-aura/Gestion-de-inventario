import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, getApiUrlAsync } from '../config/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[API] Base URL inicial:', API_CONFIG.BASE_URL);
    console.log('[API] Timeout configurado:', API_CONFIG.TIMEOUT, 'ms');

    // Interceptor para agregar token a las peticiones
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const token = await AsyncStorage.getItem('auth_token');
          if (token && token.trim() !== '') {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('[API] Token agregado a petición:', config.url?.substring(0, 30));
          } else {
            console.warn('[API] No hay token disponible para:', config.url);
            // Verificar si hay token guardado
            const allKeys = await AsyncStorage.getAllKeys();
            console.log('[API] Keys en AsyncStorage:', allKeys);
          }
        } catch (error) {
          console.error('[API] Error al obtener token:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Interceptor para manejar errores y logging
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
            try {
              // Log de errores para debugging
              const errorInfo: any = {
                message: error?.message || 'Unknown error',
              };
              
              if (error?.config) {
                errorInfo.url = error.config.url;
                errorInfo.method = error.config.method;
                errorInfo.baseURL = error.config.baseURL;
              }
              
              if (error?.response) {
                errorInfo.status = error.response.status;
                errorInfo.data = error.response.data;
              } else if (error?.code === 'NETWORK_ERROR' || error?.code === 'ECONNABORTED' || error?.message?.includes('Network Error') || error?.message?.includes('timeout') || error?.message?.includes('exceeded')) {
                // Error de red - backend no disponible o timeout
                errorInfo.networkError = true;
                const baseUrl = error?.config?.baseURL || API_CONFIG.BASE_URL;
                errorInfo.message = `Error de conexión. Verifica que el backend esté corriendo en ${baseUrl} y que ambos dispositivos estén en la misma red WiFi.`;
                // Agregar la propiedad networkError al error para que las pantallas puedan detectarlo
                error.networkError = true;
              }
              
              // Verificar si es un error de RUT duplicado para no mostrarlo en consola
              const isRutDuplicateError = error?.response?.status === 400 && 
                error?.response?.data?.detail && 
                typeof error.response.data.detail === 'string' &&
                error.response.data.detail.toLowerCase().includes('rut') &&
                (error.response.data.detail.toLowerCase().includes('ya existe') || 
                 error.response.data.detail.toLowerCase().includes('duplicado') ||
                 error.response.data.detail.toLowerCase().includes('existe'));
              
              // Solo mostrar el error en consola si NO es un error de RUT duplicado
              if (!isRutDuplicateError) {
                console.error('[API Error]', errorInfo);
              }
          
            if (error?.response?.status === 401) {
            // Solo limpiar token si NO es una petición de login
            const url = error?.config?.url;
            let isLoginRequest = false;
            
            if (url != null && typeof url === 'string' && url.length > 0) {
              try {
                const loginPath = '/api/auth/login';
                if (typeof url.includes === 'function') {
                  isLoginRequest = url.includes(loginPath);
                } else {
                  console.warn('[API] url.includes no es una función, url:', url);
                  isLoginRequest = false;
                }
              } catch (e) {
                console.warn('[API] Error al verificar URL:', e);
                console.warn('[API] URL type:', typeof url, 'value:', url);
                isLoginRequest = false;
              }
            } else {
              console.warn('[API] URL no válida para verificar login:', url, 'type:', typeof url);
            }
            
            if (!isLoginRequest) {
              const currentToken = await AsyncStorage.getItem('auth_token');
              // Solo limpiar si había un token (significa que el token es inválido)
              // Si no hay token, el error es porque no se envió, no porque sea inválido
              if (currentToken != null && typeof currentToken === 'string' && currentToken.trim() !== '') {
                // Verificar si el error dice "Not authenticated" (token inválido)
                const errorDetail = error?.response?.data?.detail;
                let errorDetailStr = '';
                
                try {
                  if (errorDetail != null) {
                    if (typeof errorDetail === 'string') {
                      errorDetailStr = errorDetail;
                    } else {
                      errorDetailStr = String(errorDetail);
                    }
                  }
                } catch (e) {
                  console.warn('[API] Error al convertir errorDetail:', e);
                  errorDetailStr = '';
                }
                
                if (errorDetailStr && typeof errorDetailStr === 'string' && errorDetailStr.length > 0) {
                  try {
                    const hasNotAuthenticated = errorDetailStr.includes('Not authenticated');
                    const hasInvalidToken = errorDetailStr.includes('Invalid token');
                    if (hasNotAuthenticated || hasInvalidToken) {
                      console.log('[API] Token inválido, limpiando sesión');
                      await AsyncStorage.removeItem('auth_token');
                      await AsyncStorage.removeItem('user');
                    } else {
                      console.log('[API] Error 401 pero token existe, no limpiando (puede ser error temporal)');
                    }
                  } catch (e) {
                    console.warn('[API] Error al verificar errorDetail:', e);
                    console.warn('[API] errorDetailStr type:', typeof errorDetailStr, 'value:', errorDetailStr);
                  }
                } else {
                  console.log('[API] Error 401 pero token existe, no limpiando (puede ser error temporal)');
                }
              } else {
                console.log('[API] Error 401 sin token - no se envió token en la petición');
              }
            }
          }
        } catch (interceptorError) {
          console.error('[API] Error en interceptor:', interceptorError);
        }
        
        return Promise.reject(error);
      }
    );

    // Actualizar URL desde AsyncStorage al inicializar
    this.updateBaseUrl();
  }

  // Actualizar la URL del backend dinámicamente
  async updateBaseUrl(): Promise<void> {
    try {
      const url = await getApiUrlAsync();
      this.api.defaults.baseURL = url;
      API_CONFIG.BASE_URL = url;
      console.log('[API] Base URL actualizada:', url);
    } catch (error) {
      console.error('[API] Error al actualizar URL:', error);
    }
  }

  get instance(): AxiosInstance {
    return this.api;
  }
}

export const apiService = new ApiService();
export default apiService.instance;

