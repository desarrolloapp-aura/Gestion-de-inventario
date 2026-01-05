import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { trabajadoresService, Trabajador } from '../services/trabajadores';
import { prestamosService } from '../services/prestamos';
import { configService } from '../services/config';
import { useAuth } from '../context/AuthContext';

export default function TrabajadoresScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEquiposModal, setShowEquiposModal] = useState(false);
  const [showObraSelector, setShowObraSelector] = useState(false);
  const [selectedTrabajador, setSelectedTrabajador] = useState<Trabajador | null>(null);
  const [formData, setFormData] = useState({
    rut: '',
    nombre: '',
    obra: '',
    telefono: '',
    email: '',
  });
  const [rutError, setRutError] = useState<string>('');

  const queryClient = useQueryClient();

  const { data: trabajadores = [], isLoading, refetch, error } = useQuery({
    queryKey: ['trabajadores', search],
    queryFn: () => trabajadoresService.getAll({ activo: undefined }),
    refetchInterval: 30000,
    retry: 2,
  });

  const { data: obras = [], isLoading: loadingObras } = useQuery({
    queryKey: ['obras'],
    queryFn: () => configService.getObras(),
  });


  const { data: prestamos = [], isLoading: loadingPrestamos } = useQuery({
    queryKey: ['prestamos', selectedTrabajador?.rut],
    queryFn: () => prestamosService.getByRut(selectedTrabajador!.rut),
    enabled: !!selectedTrabajador,
  });

  const { data: alertas = [] } = useQuery({
    queryKey: ['alertas-trabajador', selectedTrabajador?.rut],
    queryFn: () => prestamosService.getAlertasTrabajador(selectedTrabajador!.rut),
    enabled: !!selectedTrabajador,
  });

  const createMutation = useMutation({
    mutationFn: () => trabajadoresService.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trabajadores'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      Alert.alert('Éxito', 'Trabajador creado exitosamente');
      setShowModal(false);
      setRutError('');
      setFormData({
        rut: '',
        nombre: '',
        obra: '',
        telefono: '',
        email: '',
      });
    },
    onError: (error: any) => {
      const errorDetail = error.response?.data?.detail || '';
      const errorMessage = typeof errorDetail === 'string' ? errorDetail : String(errorDetail);
      
      // Verificar si es un error de RUT duplicado
      if (errorMessage.toLowerCase().includes('rut') && 
          (errorMessage.toLowerCase().includes('ya existe') || 
           errorMessage.toLowerCase().includes('duplicado') ||
           errorMessage.toLowerCase().includes('existe'))) {
        // Mostrar error en el campo RUT en lugar de Alert
        setRutError('Este RUT ya existe');
      } else {
        // Para otros errores, mostrar Alert
        Alert.alert('Error', errorMessage || 'Error al crear trabajador');
      }
    },
  });

  const marcarDespidoMutation = useMutation({
    mutationFn: (rut: string) => trabajadoresService.marcarDespido(rut),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trabajadores'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      Alert.alert('Éxito', 'Trabajador marcado como despedido');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail || 'Error al marcar como despedido');
    },
  });

  const filteredTrabajadores = trabajadores.filter((t) => {
    if (!search || typeof search !== 'string' || !search.trim()) return true;
    try {
      const searchTerm = search.toLowerCase();
      const nombre = (t?.nombre || '').toLowerCase();
      const rut = (t?.rut || '');
      
      if (!nombre || !rut) return true;
      if (typeof nombre !== 'string' || typeof rut !== 'string') return true;
      
      return nombre.includes(searchTerm) || rut.includes(searchTerm);
    } catch (e) {
      console.warn('[TrabajadoresScreen] Error al filtrar:', e);
      return true;
    }
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleGoBack = () => {
    if (navigation && typeof navigation.goBack === 'function') {
      navigation.goBack();
    }
  };

  const handleCreate = () => {
    if (!formData.rut.trim() || !formData.nombre.trim() || !formData.obra.trim()) {
      Alert.alert('Error', 'RUT, nombre y obra son campos obligatorios');
      return;
    }
    createMutation.mutate();
  };

  const handleMarcarDespido = (trabajador: Trabajador) => {
    Alert.alert(
      'Confirmar',
      `¿Marcar a ${trabajador.nombre} como despedido?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: () => marcarDespidoMutation.mutate(trabajador.rut),
        },
      ]
    );
  };

  const handleVerEquipos = (trabajador: Trabajador) => {
    setSelectedTrabajador(trabajador);
    setShowEquiposModal(true);
  };

  const prestamosActivos = prestamos.filter((p: any) => p.estado_prestamo === 'ASIGNADO');
  const prestamosDevueltos = prestamos.filter((p: any) => p.estado_prestamo === 'DEVUELTO');

  useEffect(() => {
    if (error) {
      console.error('[TrabajadoresScreen] Error al cargar trabajadores:', error);
    }
  }, [error]);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.screenTitle}>Trabajadores</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o RUT..."
          placeholderTextColor="#6B7280"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6b7280" />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.trabajadoresList}>
          {isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.loadingText}>Cargando trabajadores...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.errorText}>Error al cargar trabajadores</Text>
              <Text style={styles.errorSubtext}>
                {(error as any)?.response?.data?.detail || 'Verifica tu conexión'}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => refetch()}
              >
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : filteredTrabajadores.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay trabajadores disponibles</Text>
              <Text style={styles.emptySubtext}>
                {search ? 'Intenta con otra búsqueda' : 'Crea tu primer trabajador con el botón +'}
              </Text>
            </View>
          ) : (
            filteredTrabajadores.map((trabajador) => (
              <TouchableOpacity
                key={trabajador.rut}
                style={styles.trabajadorCard}
                onPress={() => handleVerEquipos(trabajador)}
              >
                <LinearGradient
                  colors={['#374151', '#1f2937']}
                  style={styles.trabajadorCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.trabajadorHeader}>
                    <View style={styles.trabajadorInfo}>
                      <Text style={styles.trabajadorNombre}>{trabajador.nombre}</Text>
                      <Text style={styles.trabajadorRut}>RUT: {trabajador.rut}</Text>
                      <Text style={styles.trabajadorObra}>{trabajador.obra}</Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      trabajador.activo ? styles.statusActivo : styles.statusInactivo,
                    ]}>
                      <Text style={styles.statusText}>
                        {trabajador.activo ? 'Activo' : 'Inactivo'}
                      </Text>
                    </View>
                  </View>
                  {(trabajador.telefono || trabajador.email) && (
                    <View style={styles.contactContainer}>
                      {trabajador.telefono && (
                        <Text style={styles.contactText}>📞 {trabajador.telefono}</Text>
                      )}
                      {trabajador.email && (
                        <Text style={styles.contactText}>✉️ {trabajador.email}</Text>
                      )}
                    </View>
                  )}
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleVerEquipos(trabajador);
                      }}
                    >
                      <Text style={styles.actionButtonText}>Ver Equipos</Text>
                    </TouchableOpacity>
                    {user?.rol === 'RRHH' && trabajador.activo && (
                      <TouchableOpacity
                        style={styles.despidoButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleMarcarDespido(trabajador);
                        }}
                        disabled={marcarDespidoMutation.isPending}
                      >
                        <Text style={styles.despidoButtonText}>Despedir</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {(user?.rol === 'INFORMATICA' || user?.rol === 'RRHH') && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowModal(true)}
        >
          <LinearGradient
            colors={['#374151', '#1f2937']}
            style={styles.fabGradient}
          >
            <Text style={styles.fabText}>+</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Modal Crear Trabajador */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 8) + 40 }]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Crear Trabajador</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>RUT *</Text>
                <TextInput
                  style={[styles.input, rutError && styles.inputError]}
                  placeholder="Ingresa el RUT"
                  placeholderTextColor="#6B7280"
                  value={formData.rut}
                  onChangeText={(text) => {
                    setFormData({ ...formData, rut: text });
                    // Limpiar error cuando el usuario empiece a escribir
                    if (rutError) {
                      setRutError('');
                    }
                  }}
                />
                {rutError ? (
                  <Text style={styles.fieldErrorText}>{rutError}</Text>
                ) : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ingresa el nombre completo"
                  placeholderTextColor="#6B7280"
                  value={formData.nombre}
                  onChangeText={(text) => setFormData({ ...formData, nombre: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Obra *</Text>
                <TouchableOpacity
                  style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (loadingObras) {
                      Alert.alert('Cargando', 'Cargando obras, por favor espera...');
                      return;
                    }
                    if (obras.length === 0) {
                      Alert.alert('Aviso', 'No hay obras disponibles. Por favor crea una obra primero desde el menú de Obras.');
                    } else {
                      setShowObraSelector(true);
                    }
                  }}
                >
                  <Text style={formData.obra ? styles.inputText : styles.inputPlaceholder}>
                    {formData.obra || 'Seleccionar obra'}
                  </Text>
                  <Text style={[styles.inputText, { marginLeft: 8 }]}>▼</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Teléfono</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ingresa el teléfono"
                  placeholderTextColor="#6B7280"
                  value={formData.telefono}
                  onChangeText={(text) => setFormData({ ...formData, telefono: text })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ingresa el email"
                  placeholderTextColor="#6B7280"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreate}
                disabled={createMutation.isPending}
              >
                <LinearGradient
                  colors={createMutation.isPending ? ['#6B7280', '#4B5563'] : ['#374151', '#1f2937']}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>
                    {createMutation.isPending ? 'Creando...' : 'Crear Trabajador'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>

          {/* Selector de Obra - Overlay dentro del modal de crear trabajador */}
          {showObraSelector && (
            <View style={styles.obraSelectorOverlay}>
              <LinearGradient
                colors={['#1a1a2e', '#16213e', '#0f3460']}
                style={styles.obraSelectorContent}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Seleccionar Obra</Text>
                  <TouchableOpacity onPress={() => {
                    setShowObraSelector(false);
                  }}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.obraList} showsVerticalScrollIndicator={false}>
                  {obras.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No hay obras disponibles</Text>
                      <Text style={styles.emptySubtext}>Crea una obra primero desde el menú de Obras</Text>
                    </View>
                  ) : (
                    obras.map((obra) => (
                      <TouchableOpacity
                        key={obra}
                        style={[
                          styles.obraOption,
                          formData.obra === obra && styles.obraOptionSelected,
                        ]}
                        onPress={() => {
                          setFormData({ ...formData, obra });
                          setShowObraSelector(false);
                        }}
                      >
                        <Text style={[
                          styles.obraOptionText,
                          formData.obra === obra && styles.obraOptionTextSelected,
                        ]}>
                          {obra}
                        </Text>
                        {formData.obra === obra && (
                          <Text style={styles.obraOptionCheck}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </LinearGradient>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Equipos Prestados */}
      <Modal
        visible={showEquiposModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowEquiposModal(false);
          setSelectedTrabajador(null);
        }}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={styles.equiposModalContent}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {selectedTrabajador?.nombre}
                </Text>
                <Text style={styles.modalSubtitle}>
                  RUT: {selectedTrabajador?.rut} • {selectedTrabajador?.obra}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowEquiposModal(false);
                  setSelectedTrabajador(null);
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.equiposModalScroll} showsVerticalScrollIndicator={false}>
              {loadingPrestamos ? (
                <Text style={styles.loadingText}>Cargando...</Text>
              ) : prestamos.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No tiene historial de préstamos</Text>
                </View>
              ) : (
                <>
                  {alertas.length > 0 && (
                    <View style={styles.alertasContainer}>
                      <Text style={styles.sectionTitle}>⚠️ Alertas Pendientes</Text>
                      {alertas.map((alerta: any, idx: number) => (
                        <View key={idx} style={styles.alertaCard}>
                          <Text style={styles.alertaEquipo}>
                            {alerta.equipo_serie} - {alerta.equipo_tipo}
                          </Text>
                          <View style={styles.problemasContainer}>
                            {alerta.problemas.map((problema: string, pIdx: number) => (
                              <Text key={pIdx} style={styles.problemaTag}>
                                {problema === 'Sin cargador' ? '🔌 Sin cargador' : '❌ Equipo en mal estado'}
                              </Text>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {prestamosActivos.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>
                        Equipos Prestados ({prestamosActivos.length})
                      </Text>
                      {prestamosActivos.map((prestamo: any) => (
                        <View key={prestamo.id} style={styles.prestamoCard}>
                          <Text style={styles.prestamoSerie}>{prestamo.equipo?.serie}</Text>
                          <Text style={styles.prestamoEquipo}>
                            {prestamo.equipo?.tipo} {prestamo.equipo?.marca} {prestamo.equipo?.modelo}
                          </Text>
                          <Text style={styles.prestamoFecha}>
                            Prestado: {new Date(prestamo.fecha_prestamo).toLocaleDateString()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {prestamosDevueltos.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>
                        Historial de Devoluciones ({prestamosDevueltos.length})
                      </Text>
                      {prestamosDevueltos.map((prestamo: any) => (
                        <View key={prestamo.id} style={styles.prestamoCard}>
                          <Text style={styles.prestamoSerie}>{prestamo.equipo?.serie}</Text>
                          <Text style={styles.prestamoEquipo}>
                            {prestamo.equipo?.tipo} {prestamo.equipo?.marca} {prestamo.equipo?.modelo}
                          </Text>
                          {prestamo.fecha_devolucion && (
                            <Text style={styles.prestamoFecha}>
                              Devuelto: {new Date(prestamo.fecha_devolucion).toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </LinearGradient>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  trabajadoresList: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 40,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  trabajadorCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  trabajadorCardGradient: {
    padding: 20,
  },
  trabajadorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  trabajadorInfo: {
    flex: 1,
  },
  trabajadorNombre: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  trabajadorRut: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  trabajadorObra: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusActivo: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusInactivo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  contactContainer: {
    marginTop: 12,
    gap: 4,
  },
  contactText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  despidoButton: {
    backgroundColor: 'rgba(153, 27, 27, 0.3)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(153, 27, 27, 0.5)',
  },
  despidoButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 999,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  equiposModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  modalClose: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  modalForm: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  equiposModalScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
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
    minHeight: 52,
    justifyContent: 'center',
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  fieldErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  inputText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  inputPlaceholder: {
    color: '#6B7280',
    fontSize: 16,
  },
  obraSelectorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  obraSelectorContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingTop: 20,
    paddingBottom: 20,
    width: '100%',
    minHeight: 200,
  },
  obraList: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  obraOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  obraOptionSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  obraOptionText: {
    color: '#E5E7EB',
    fontSize: 16,
    flex: 1,
  },
  obraOptionTextSelected: {
    color: '#60A5FA',
    fontWeight: '600',
  },
  obraOptionCheck: {
    color: '#60A5FA',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
  },
  submitButtonGradient: {
    padding: 18,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  alertasContainer: {
    marginBottom: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  alertaCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  alertaEquipo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  problemasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  problemaTag: {
    fontSize: 12,
    color: '#dc2626',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  prestamoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  prestamoSerie: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  prestamoEquipo: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  prestamoFecha: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
