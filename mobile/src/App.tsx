import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import { saveBackendUrl, getApiUrlAsync } from './config/api';
import { apiService } from './services/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      refetchInterval: 30000, // Refrescar cada 30 segundos para sincronización
    },
  },
});

export default function App() {
  // Configurar URL automáticamente al iniciar la app (silenciosamente)
  useEffect(() => {
    const configureUrlSilently = async () => {
      try {
        const currentUrl = await getApiUrlAsync();
        const productionUrl = 'https://aura-backend-u905.onrender.com';
        
        // Si no hay URL o no es la de producción, configurarla automáticamente
        if (!currentUrl || currentUrl.trim() === '' || !currentUrl.includes('aura-backend-u905.onrender.com')) {
          await saveBackendUrl(productionUrl);
          await apiService.updateBaseUrl();
          console.log('[APP] URL configurada automáticamente:', productionUrl);
        }
      } catch (error) {
        // Silenciosamente, sin mostrar errores al usuario
        console.warn('[APP] Error al configurar URL automáticamente:', error);
      }
    };
    
    configureUrlSilently();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </QueryClientProvider>
  );
}

