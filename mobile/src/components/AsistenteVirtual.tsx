import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { asistenteService } from '../services/asistente';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  onClose: () => void;
}

interface Mensaje {
  tipo: 'usuario' | 'asistente';
  texto: string;
  sugerencias?: string[];
}

export default function AsistenteVirtual({ onClose }: Props) {
  const insets = useSafeAreaInsets();
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
  ]);
  const [inputMensaje, setInputMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const mensajesEndRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Scroll al final cuando hay nuevos mensajes
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [mensajes]);

  const enviarMensaje = async (texto?: string) => {
    const mensajeTexto = texto || inputMensaje.trim();
    if (!mensajeTexto || cargando) return;

    // Agregar mensaje del usuario
    setMensajes(prev => [...prev, { tipo: 'usuario', texto: mensajeTexto }]);
    setInputMensaje('');
    setCargando(true);

    try {
      // Preparar historial
      const historial = mensajes
        .filter(m => m.tipo !== 'asistente' || !m.texto.includes('¡Hola! Soy tu asistente'))
        .map(m => ({
          tipo: m.tipo === 'usuario' ? 'usuario' as const : 'asistente' as const,
          texto: m.texto
        }));
      
      historial.push({
        tipo: 'usuario',
        texto: mensajeTexto
      });

      const respuesta = await asistenteService.chat(mensajeTexto, historial);
      
      setMensajes(prev => [...prev, {
        tipo: 'asistente',
        texto: respuesta.respuesta,
        sugerencias: respuesta.sugerencias
      }]);
    } catch (error: any) {
      console.error('[Asistente] Error al enviar mensaje:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Error desconocido';
      setMensajes(prev => [...prev, {
        tipo: 'asistente',
        texto: `Lo siento, hubo un error al procesar tu consulta: ${errorMessage}. Por favor intenta de nuevo.`
      }]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity 
            style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]} 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.2)', 'rgba(147, 51, 234, 0.2)']}
              style={styles.header}
            >
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconContainer}>
                    <Text style={styles.iconText}>🤖</Text>
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Asistente Virtual</Text>
                    <Text style={styles.headerSubtitle}>Pregúntame lo que necesites</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <MaterialIcons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Mensajes */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.mensajesContainer}
              contentContainerStyle={styles.mensajesContent}
              showsVerticalScrollIndicator={false}
            >
              {mensajes.map((msg, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.mensajeContainer,
                    msg.tipo === 'usuario' ? styles.mensajeUsuario : styles.mensajeAsistente
                  ]}
                >
                  <View
                    style={[
                      styles.mensajeBubble,
                      msg.tipo === 'usuario' ? styles.mensajeBubbleUsuario : styles.mensajeBubbleAsistente
                    ]}
                  >
                    <Text style={[
                      styles.mensajeTexto,
                      msg.tipo === 'usuario' ? styles.mensajeTextoUsuario : styles.mensajeTextoAsistente
                    ]}>
                      {msg.texto}
                    </Text>
                    
                    {msg.sugerencias && msg.sugerencias.length > 0 && (
                      <View style={styles.sugerenciasContainer}>
                        {msg.sugerencias.map((sug, sugIdx) => (
                          <TouchableOpacity
                            key={sugIdx}
                            onPress={() => enviarMensaje(sug)}
                            style={styles.sugerenciaButton}
                          >
                            <Text style={styles.sugerenciaText}>{sug}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ))}
              
              {cargando && (
                <View style={[styles.mensajeContainer, styles.mensajeAsistente]}>
                  <View style={[styles.mensajeBubble, styles.mensajeBubbleAsistente]}>
                    <View style={styles.loadingContainer}>
                      <View style={[styles.loadingDot, { animationDelay: '0ms' }]} />
                      <View style={[styles.loadingDot, { animationDelay: '100ms' }]} />
                      <View style={[styles.loadingDot, { animationDelay: '200ms' }]} />
                    </View>
                  </View>
                </View>
              )}
              
              <View ref={mensajesEndRef} />
            </ScrollView>

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputMensaje}
                onChangeText={setInputMensaje}
                placeholder="Escribe tu pregunta..."
                placeholderTextColor="#6B7280"
                multiline
                editable={!cargando}
              />
              <TouchableOpacity
                onPress={() => enviarMensaje()}
                disabled={!inputMensaje.trim() || cargando}
                style={[styles.sendButton, (!inputMensaje.trim() || cargando) && styles.sendButtonDisabled]}
              >
                <LinearGradient
                  colors={(!inputMensaje.trim() || cargando) ? ['#4B5563', '#374151'] : ['#3B82F6', '#2563EB']}
                  style={styles.sendButtonGradient}
                >
                  <MaterialIcons name="send" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    width: '100%',
    maxWidth: 600,
    height: '85%',
    maxHeight: '85%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  mensajesContainer: {
    flex: 1,
  },
  mensajesContent: {
    padding: 16,
    gap: 16,
  },
  mensajeContainer: {
    flexDirection: 'row',
  },
  mensajeUsuario: {
    justifyContent: 'flex-end',
  },
  mensajeAsistente: {
    justifyContent: 'flex-start',
  },
  mensajeBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  mensajeBubbleUsuario: {
    backgroundColor: '#3B82F6',
  },
  mensajeBubbleAsistente: {
    backgroundColor: '#374151',
  },
  mensajeTexto: {
    fontSize: 14,
    lineHeight: 20,
  },
  mensajeTextoUsuario: {
    color: '#FFFFFF',
  },
  mensajeTextoAsistente: {
    color: '#E5E7EB',
  },
  sugerenciasContainer: {
    marginTop: 12,
    gap: 8,
  },
  sugerenciaButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 10,
  },
  sugerenciaText: {
    color: '#D1D5DB',
    fontSize: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

