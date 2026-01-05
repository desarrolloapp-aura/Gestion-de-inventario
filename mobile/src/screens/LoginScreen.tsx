import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { saveBackendUrl, getApiUrlAsync } from '../config/api';
import { apiService } from '../services/api';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // Configurar URL automáticamente al montar (silenciosamente)
  React.useEffect(() => {
    const configureUrlSilently = async () => {
      try {
        const currentUrl = await getApiUrlAsync();
        const productionUrl = 'https://aura-backend-u905.onrender.com';
        
        // Si no hay URL o no es la de producción, configurarla automáticamente
        if (!currentUrl || currentUrl.trim() === '' || !currentUrl.includes('aura-backend-u905.onrender.com')) {
          await saveBackendUrl(productionUrl);
          await apiService.updateBaseUrl();
          console.log('[LOGIN] URL configurada automáticamente:', productionUrl);
        }
      } catch (error) {
        // Silenciosamente, sin mostrar errores al usuario
        console.warn('[LOGIN] Error al configurar URL automáticamente:', error);
      }
    };
    
    configureUrlSilently();
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    // Asegurar que la URL esté configurada silenciosamente (debería estar automáticamente)
    try {
      const currentUrl = await getApiUrlAsync();
      const productionUrl = 'https://aura-backend-u905.onrender.com';
      
      if (!currentUrl || currentUrl.trim() === '' || !currentUrl.includes('aura-backend-u905.onrender.com')) {
        // Configurar URL silenciosamente sin mostrar nada al usuario
        await saveBackendUrl(productionUrl);
        await apiService.updateBaseUrl();
        console.log('[LOGIN] URL configurada silenciosamente antes del login');
      }
    } catch (error) {
      // Silenciosamente, sin mostrar errores
      console.warn('[LOGIN] Error al verificar URL:', error);
    }

    setLoading(true);
    try {
      await login(username, password);
      // La navegación se manejará automáticamente por AppNavigator
    } catch (error: any) {
      console.error('Error de login:', error);
      let errorMessage = 'Error al iniciar sesión';
      
      if (error.response) {
        errorMessage = error.response.data?.detail || error.response.data?.message || errorMessage;
      } else if (error.request || error.networkError || error.message?.includes('conexión') || error.message?.includes('timeout')) {
        errorMessage = 'No se pudo conectar al servidor. Por favor verifica tu conexión a internet.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460', '#533483']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {/* Logo/Icono circular */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#374151', '#1f2937', '#111827']}
              style={styles.logoCircle}
            >
              <Text style={styles.logoText}>AURA</Text>
            </LinearGradient>
          </View>

          <Text style={styles.welcomeText}>Bienvenido</Text>
          <Text style={styles.subtitleText}>Inicia sesión para continuar</Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Usuario / Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Ingresa tu usuario"
                placeholderTextColor="#6B7280"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <TextInput
                style={styles.input}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor="#6B7280"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#6B7280', '#4B5563'] : ['#374151', '#1f2937']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
