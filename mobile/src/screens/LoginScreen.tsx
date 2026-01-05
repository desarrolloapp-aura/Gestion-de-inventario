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
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { saveBackendUrl, getApiUrlAsync } from '../config/api';
import { apiService } from '../services/api';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUrlConfig, setShowUrlConfig] = useState(false);
  const [backendUrl, setBackendUrl] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [hasProductionUrl, setHasProductionUrl] = useState(true); // Por defecto asumimos que hay URL de producción
  const { login } = useAuth();

  // Cargar URL actual al montar (no mostrar modal automáticamente, la URL de producción ya está configurada)
  React.useEffect(() => {
    getApiUrlAsync().then(url => {
      setBackendUrl(url || '');
      // Verificar si es la URL de producción
      const isProduction = url && (url.includes('aura-backend-u905.onrender.com') || url.includes('onrender.com'));
      setHasProductionUrl(isProduction || false);
      // NO mostrar el modal automáticamente - la URL de producción ya está configurada
      // Solo mostrar si el usuario explícitamente quiere configurar una URL diferente
    });
  }, []);

  const handleSaveUrl = async () => {
    if (!backendUrl.trim()) {
      Alert.alert('Error', 'Por favor ingresa una URL válida');
      return;
    }

    // Validar formato
    if (!backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
      Alert.alert('Error', 'La URL debe comenzar con http:// o https://');
      return;
    }

    setUrlLoading(true);
    try {
      await saveBackendUrl(backendUrl.trim());
      await apiService.updateBaseUrl();
      setShowUrlConfig(false);
      Alert.alert('Éxito', 'URL del backend configurada correctamente');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al guardar la URL');
    } finally {
      setUrlLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    // Asegurar que la URL esté configurada (debería estar automáticamente)
    const currentUrl = await getApiUrlAsync();
    if (!currentUrl || currentUrl.trim() === '') {
      // Si por alguna razón no hay URL, usar la de producción
      const productionUrl = 'https://aura-backend-u905.onrender.com';
      await saveBackendUrl(productionUrl);
      await apiService.updateBaseUrl();
    }

    setLoading(true);
    try {
      await login(username, password);
      // La navegación se manejará automáticamente por AppNavigator
    } catch (error: any) {
      console.error('Error de login:', error);
      let errorMessage = 'Error al iniciar sesión';
      let isConnectionError = false;
      
      if (error.response) {
        errorMessage = error.response.data?.detail || error.response.data?.message || errorMessage;
      } else if (error.request || error.networkError || error.message?.includes('conexión') || error.message?.includes('timeout')) {
        errorMessage = 'No se pudo conectar al servidor. Verifica que el backend esté corriendo y que la IP sea correcta.';
        isConnectionError = true;
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      if (isConnectionError) {
        // Mostrar opción para configurar URL
        Alert.alert(
          'Error de conexión',
          errorMessage,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Configurar URL', onPress: () => setShowUrlConfig(true) }
          ]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
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

            {/* Solo mostrar botón de configurar URL si no hay URL de producción configurada */}
            {!hasProductionUrl && (
              <TouchableOpacity
                style={styles.configButton}
                onPress={() => setShowUrlConfig(true)}
              >
                <Text style={styles.configButtonText}>Configurar URL del servidor</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Modal para configurar URL */}
      <Modal
        visible={showUrlConfig}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUrlConfig(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configurar URL del Backend</Text>
            <Text style={styles.modalSubtitle}>
              Ingresa la dirección IP y puerto del servidor
            </Text>
            <Text style={styles.modalExample}>
              Ejemplo: http://192.168.1.113:8000
            </Text>
            
            <TextInput
              style={styles.urlInput}
              placeholder="http://192.168.1.113:8000"
              placeholderTextColor="#6B7280"
              value={backendUrl}
              onChangeText={setBackendUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowUrlConfig(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave, urlLoading && styles.modalButtonDisabled]}
                onPress={handleSaveUrl}
                disabled={urlLoading}
              >
                <Text style={styles.modalButtonSaveText}>
                  {urlLoading ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  configButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  configButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalExample: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  urlInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalButtonSave: {
    backgroundColor: '#374151',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSaveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
