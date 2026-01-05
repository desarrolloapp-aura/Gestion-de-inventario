import React, { useState } from 'react';
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
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { equiposService, Equipo } from '../services/equipos';
import { configService } from '../services/config';
import { useAuth } from '../context/AuthContext';
import { prestamosService } from '../services/prestamos';
import { trabajadoresService } from '../services/trabajadores';
import * as Sharing from 'expo-sharing';
import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type EquiposScreenRouteProp = RouteProp<{ Equipos: { scannedEquipo?: Equipo; action?: 'prestar' | 'devolver' } }, 'Equipos'>;

export default function EquiposScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute<EquiposScreenRouteProp>();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPrestarModal, setShowPrestarModal] = useState(false);
  const [showDevolverModal, setShowDevolverModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedEquipo, setSelectedEquipo] = useState<Equipo | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    serie: '',
    marca: '',
    modelo: '',
    tipo: '',
    estado_dispositivo: 'OPERATIVO' as 'OPERATIVO' | 'MANTENCIÓN' | 'BAJA',
    ram_gb: '',
    ssd_gb: '',
    so: '',
    observaciones: '',
  });

  const queryClient = useQueryClient();

  const { data: equipos = [], isLoading, refetch, error } = useQuery({
    queryKey: ['equipos', search],
    queryFn: () => equiposService.getAll({ serie: search || undefined }),
    refetchInterval: 30000,
    retry: 2,
    // Mantener los datos anteriores mientras se recarga
    keepPreviousData: true,
  });

  // Log para debugging
  React.useEffect(() => {
    if (error) {
      console.error('[EquiposScreen] Error al cargar equipos:', error);
    }
    if (equipos) {
      console.log('[EquiposScreen] Equipos cargados:', equipos.length);
    }
  }, [error, equipos]);

  // Manejar equipo escaneado desde QR Scanner
  const processedScanRef = React.useRef<string | null>(null);
  
  // Usar useFocusEffect para asegurar que se ejecute cuando la pantalla está enfocada
  useFocusEffect(
    React.useCallback(() => {
      const params = route.params;
      if (params?.scannedEquipo && params?.action) {
        const scanKey = `${params.scannedEquipo.id}-${params.action}`;
        
        // Evitar procesar el mismo escaneo múltiples veces
        // Pero se limpia cuando se cierra el modal, permitiendo escanear de nuevo
        if (processedScanRef.current === scanKey) {
          return;
        }
        
        processedScanRef.current = scanKey;
        const equipo = params.scannedEquipo;
        
        // Asegurarse de que el equipo tenga todos los datos necesarios
        setSelectedEquipo(equipo);
        
        // Usar un delay más largo para asegurar que la pantalla esté completamente cargada
        const timer = setTimeout(() => {
          if (params.action === 'prestar') {
            setShowPrestarModal(true);
          } else if (params.action === 'devolver') {
            setShowDevolverModal(true);
          }
        }, 500);
        
        // Limpiar parámetros después de procesarlos
        setTimeout(() => {
          (navigation as any).setParams({ scannedEquipo: undefined, action: undefined });
        }, 2000);
        
        return () => {
          clearTimeout(timer);
        };
      }
    }, [route.params, navigation])
  );
  
  // También verificar cuando cambian los parámetros directamente
  React.useEffect(() => {
    const params = route.params;
    if (params?.scannedEquipo && params?.action) {
      const scanKey = `${params.scannedEquipo.id}-${params.action}-${Date.now()}`;
      
      // Solo evitar si es exactamente el mismo escaneo (mismo timestamp)
      // Esto permite escanear el mismo equipo de nuevo después de cerrar el modal
      if (processedScanRef.current === scanKey) {
        return;
      }
      
      processedScanRef.current = scanKey;
      const equipo = params.scannedEquipo;
      
      // Asegurarse de que el equipo tenga todos los datos necesarios
      setSelectedEquipo(equipo);
      
      // Delay para asegurar que el estado se actualice y la pantalla esté lista
      const timer = setTimeout(() => {
        if (params.action === 'prestar') {
          setShowPrestarModal(true);
        } else if (params.action === 'devolver') {
          setShowDevolverModal(true);
        }
      }, 300);
      
      // Limpiar parámetros después de procesarlos
      setTimeout(() => {
        (navigation as any).setParams({ scannedEquipo: undefined, action: undefined });
      }, 2000);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [route.params?.scannedEquipo?.id, route.params?.action, navigation]);

  const { data: tiposEquipos = [] } = useQuery({
    queryKey: ['tipos-equipos'],
    queryFn: () => configService.getTiposEquipos(),
  });

  // Obtener equipo seleccionado para editar
  const { data: equipoParaEditar } = useQuery({
    queryKey: ['equipo', selectedEquipo?.id],
    queryFn: () => equiposService.getById(selectedEquipo!.id),
    enabled: !!selectedEquipo && showEditModal,
  });

  // Obtener trabajadores para préstamo
  const { data: trabajadores = [] } = useQuery({
    queryKey: ['trabajadores-activos'],
    queryFn: () => trabajadoresService.getAll({ activo: true }),
    enabled: showPrestarModal,
  });

  const [editFormData, setEditFormData] = useState({
    marca: '',
    modelo: '',
    tipo: '',
    estado_dispositivo: 'OPERATIVO' as 'OPERATIVO' | 'MANTENCIÓN' | 'BAJA',
    ram_gb: '',
    ssd_gb: '',
    so: '',
    observaciones: '',
  });

  const [prestarData, setPrestarData] = useState({
    trabajador_rut: '',
    estado_entrega_bueno: true,
    estado_entrega_con_cargador: true,
    observaciones_entrega: '',
  });

  const [devolverData, setDevolverData] = useState({
    estado_devolucion_bueno: true,
    estado_devolucion_con_cargador: true,
    observaciones_devolucion: '',
  });

  // Cargar datos del equipo cuando se abre el modal de editar
  React.useEffect(() => {
    if (equipoParaEditar) {
      setEditFormData({
        marca: equipoParaEditar.marca || '',
        modelo: equipoParaEditar.modelo || '',
        tipo: equipoParaEditar.tipo || '',
        estado_dispositivo: equipoParaEditar.estado_dispositivo,
        ram_gb: equipoParaEditar.ram_gb?.toString() || '',
        ssd_gb: equipoParaEditar.ssd_gb?.toString() || '',
        so: equipoParaEditar.so || '',
        observaciones: equipoParaEditar.observaciones || '',
      });
    }
  }, [equipoParaEditar]);

  const updateMutation = useMutation({
    mutationFn: () => equiposService.update(selectedEquipo!.id, {
      marca: editFormData.marca.trim(),
      modelo: editFormData.modelo.trim(),
      tipo: editFormData.tipo.trim().toUpperCase(),
      estado_dispositivo: editFormData.estado_dispositivo,
      ram_gb: editFormData.ram_gb ? parseInt(editFormData.ram_gb) : undefined,
      ssd_gb: editFormData.ssd_gb ? parseInt(editFormData.ssd_gb) : undefined,
      so: editFormData.so?.trim() || undefined,
      observaciones: editFormData.observaciones?.trim() || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipos'] });
      queryClient.invalidateQueries({ queryKey: ['equipo', selectedEquipo?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      Alert.alert('Éxito', 'Equipo actualizado exitosamente');
      setShowEditModal(false);
      setSelectedEquipo(null);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail || 'Error al actualizar equipo');
    },
  });

  const prestarMutation = useMutation({
    mutationFn: () => {
      if (!prestarData.trabajador_rut) {
        throw new Error('Debes seleccionar un trabajador');
      }
      const trabajador = trabajadores.find(t => t.rut === prestarData.trabajador_rut);
      if (!trabajador) {
        throw new Error('Trabajador no encontrado');
      }
      return prestamosService.create({
        equipo_id: selectedEquipo!.id,
        trabajador_rut: trabajador.rut,
        obra: trabajador.obra,
        estado_entrega_bueno: prestarData.estado_entrega_bueno,
        estado_entrega_con_cargador: prestarData.estado_entrega_con_cargador,
        observaciones_entrega: prestarData.observaciones_entrega?.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipos'] });
      queryClient.invalidateQueries({ queryKey: ['prestamos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      Alert.alert('Éxito', 'Equipo prestado exitosamente');
      setShowPrestarModal(false);
      setSelectedEquipo(null);
      processedScanRef.current = null; // Limpiar referencia para permitir escanear de nuevo
      setPrestarData({
        trabajador_rut: '',
        estado_entrega_bueno: true,
        estado_entrega_con_cargador: true,
        observaciones_entrega: '',
      });
      // Limpiar parámetros de navegación
      (navigation as any).setParams({ scannedEquipo: undefined, action: undefined });
    },
    onError: (error: any) => {
      console.error('[EquiposScreen] Error al prestar:', error);
      let errorMessage = 'Error al prestar equipo';
      
      // Obtener mensaje de error del backend
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.networkError) {
        errorMessage = 'Error de conexión. Verifica que el backend esté corriendo y que ambos dispositivos estén en la misma red WiFi.';
      }
      
      Alert.alert('Error al prestar equipo', errorMessage);
      // Limpiar referencia para permitir intentar de nuevo
      processedScanRef.current = null;
      // Limpiar parámetros de navegación para evitar que se abra de nuevo
      (navigation as any).setParams({ scannedEquipo: undefined, action: undefined });
    },
  });

  const devolverMutation = useMutation({
    mutationFn: () => {
      if (!selectedEquipo?.prestamo_activo?.id) {
        throw new Error('No hay préstamo activo para este equipo');
      }
      return prestamosService.devolver(selectedEquipo.prestamo_activo.id, {
        estado_devolucion_bueno: devolverData.estado_devolucion_bueno,
        estado_devolucion_con_cargador: devolverData.estado_devolucion_con_cargador,
        observaciones_devolucion: devolverData.observaciones_devolucion?.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipos'] });
      queryClient.invalidateQueries({ queryKey: ['prestamos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      Alert.alert('Éxito', 'Equipo devuelto exitosamente');
      setShowDevolverModal(false);
      setSelectedEquipo(null);
      processedScanRef.current = null; // Limpiar referencia para permitir escanear de nuevo
      setDevolverData({
        estado_devolucion_bueno: true,
        estado_devolucion_con_cargador: true,
        observaciones_devolucion: '',
      });
      // Limpiar parámetros de navegación
      (navigation as any).setParams({ scannedEquipo: undefined, action: undefined });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || error.message || 'Error al devolver equipo';
      Alert.alert('Error', errorMessage);
      // Limpiar referencia para permitir intentar de nuevo
      processedScanRef.current = null;
      // Limpiar parámetros de navegación para evitar que se abra de nuevo
      (navigation as any).setParams({ scannedEquipo: undefined, action: undefined });
    },
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const equipoData = {
        serie: formData.serie.trim().toUpperCase(),
        marca: formData.marca.trim(),
        modelo: formData.modelo.trim(),
        tipo: formData.tipo.trim().toUpperCase(),
        estado_dispositivo: formData.estado_dispositivo,
        ram_gb: formData.ram_gb ? parseInt(formData.ram_gb) : undefined,
        ssd_gb: formData.ssd_gb ? parseInt(formData.ssd_gb) : undefined,
        so: formData.so?.trim() || undefined,
        observaciones: formData.observaciones?.trim() || undefined,
      };
      return equiposService.create(equipoData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      Alert.alert('Éxito', 'Equipo creado exitosamente');
      setShowModal(false);
      setFormData({
        serie: '',
        marca: '',
        modelo: '',
        tipo: '',
        estado_dispositivo: 'OPERATIVO',
        ram_gb: '',
        ssd_gb: '',
        so: '',
        observaciones: '',
      });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail || 'Error al crear equipo');
    },
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
    if (!formData.serie.trim() || !formData.marca.trim() || !formData.modelo.trim() || !formData.tipo.trim()) {
      Alert.alert('Error', 'Serie, marca, modelo y tipo son obligatorios');
      return;
    }
    createMutation.mutate();
  };

  const getStatusColor = (estado: string) => {
    // Todos los estados usan el mismo color gris oscuro profesional
    return ['#374151', '#1f2937'];
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.screenTitle}>Equipos</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por serie..."
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
        <View style={styles.equiposList}>
          {isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.loadingText}>Cargando equipos...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.errorText}>Error al cargar equipos</Text>
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
          ) : equipos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay equipos disponibles</Text>
              <Text style={styles.emptySubtext}>
                {search ? 'Intenta con otra búsqueda' : 'Crea tu primer equipo con el botón +'}
              </Text>
            </View>
          ) : (
            equipos.map((equipo) => (
              <TouchableOpacity 
                key={equipo.id} 
                style={styles.equipoCard}
                onPress={() => {
                  setSelectedEquipo(equipo);
                  setShowActionSheet(true);
                }}
              >
                <LinearGradient
                  colors={getStatusColor(equipo.estado_dispositivo)}
                  style={styles.equipoCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.equipoHeader}>
                    <View>
                      <Text style={styles.equipoSerie}>{equipo.serie}</Text>
                      <Text style={styles.equipoInfo}>
                        {equipo.tipo} • {equipo.marca} {equipo.modelo}
                      </Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>{equipo.estado_dispositivo}</Text>
                    </View>
                  </View>
                  {(equipo.ram_gb || equipo.ssd_gb || equipo.so) && (
                    <View style={styles.specsContainer}>
                      {equipo.ram_gb && (
                        <Text style={styles.specText}>RAM: {equipo.ram_gb}GB</Text>
                      )}
                      {equipo.ssd_gb && (
                        <Text style={styles.specText}>SSD: {equipo.ssd_gb}GB</Text>
                      )}
                      {equipo.so && (
                        <Text style={styles.specText}>SO: {equipo.so}</Text>
                      )}
                    </View>
                  )}
                  {equipo.prestamo_activo && (
                    <View style={styles.prestamoInfo}>
                      <Text style={styles.prestamoLabel}>Prestado a:</Text>
                      <Text style={styles.prestamoText}>
                        {equipo.prestamo_activo.trabajador?.nombre || 'N/A'}
                      </Text>
                    </View>
                  )}
                  {!equipo.prestamo_activo && equipo.ultimo_prestamo_devuelto && (
                    <View style={styles.ultimoPrestamoInfo}>
                      <Text style={styles.ultimoPrestamoLabel}>Último préstamo:</Text>
                      <Text style={styles.ultimoPrestamoText}>
                        {equipo.ultimo_prestamo_devuelto.trabajador?.nombre || 'N/A'}
                      </Text>
                      {equipo.ultimo_prestamo_devuelto.fecha_devolucion && (
                        <Text style={styles.ultimoPrestamoFecha}>
                          Devuelto: {new Date(equipo.ultimo_prestamo_devuelto.fecha_devolucion).toLocaleString('es-CL', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      )}
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {user?.rol === 'INFORMATICA' && (
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
              <Text style={styles.modalTitle}>Crear Equipo</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalForm} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 8) + 20 }}
            >
              <View style={styles.formGroup}>
                <Text style={styles.label}>Serie *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ingresa la serie"
                  placeholderTextColor="#6B7280"
                  value={formData.serie}
                  onChangeText={(text) => setFormData({ ...formData, serie: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Marca *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ingresa la marca"
                  placeholderTextColor="#6B7280"
                  value={formData.marca}
                  onChangeText={(text) => setFormData({ ...formData, marca: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Modelo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ingresa el modelo"
                  placeholderTextColor="#6B7280"
                  value={formData.modelo}
                  onChangeText={(text) => setFormData({ ...formData, modelo: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tipo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: NOTEBOOK, PC, AIO"
                  placeholderTextColor="#6B7280"
                  value={formData.tipo}
                  onChangeText={(text) => setFormData({ ...formData, tipo: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Estado</Text>
                <View style={styles.radioGroup}>
                  {(['OPERATIVO', 'MANTENCIÓN', 'BAJA'] as const).map((estado) => (
                    <TouchableOpacity
                      key={estado}
                      style={[
                        styles.radioButton,
                        formData.estado_dispositivo === estado && styles.radioButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, estado_dispositivo: estado })}
                    >
                      <Text
                        style={[
                          styles.radioText,
                          formData.estado_dispositivo === estado && styles.radioTextActive,
                        ]}
                      >
                        {estado}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>RAM (GB)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 8, 16, 32"
                  placeholderTextColor="#6B7280"
                  value={formData.ram_gb}
                  onChangeText={(text) => setFormData({ ...formData, ram_gb: text })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>SSD (GB)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 256, 512, 1024"
                  placeholderTextColor="#6B7280"
                  value={formData.ssd_gb}
                  onChangeText={(text) => setFormData({ ...formData, ssd_gb: text })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Sistema Operativo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Windows 11, Ubuntu 22.04"
                  placeholderTextColor="#6B7280"
                  value={formData.so}
                  onChangeText={(text) => setFormData({ ...formData, so: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Observaciones</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Observaciones adicionales"
                  placeholderTextColor="#6B7280"
                  value={formData.observaciones}
                  onChangeText={(text) => setFormData({ ...formData, observaciones: text })}
                  multiline
                  numberOfLines={3}
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
                    {createMutation.isPending ? 'Creando...' : 'Crear Equipo'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </KeyboardAvoidingView>
      </Modal>

      {/* ActionSheet para acciones del equipo */}
      <Modal
        visible={showActionSheet}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowActionSheet(false);
          setSelectedEquipo(null);
        }}
      >
        <TouchableOpacity
          style={styles.actionSheetOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowActionSheet(false);
            setSelectedEquipo(null);
          }}
        >
          <View style={styles.actionSheet}>
            <View style={styles.actionSheetHeader}>
              <Text style={styles.actionSheetTitle}>
                {selectedEquipo?.serie}
              </Text>
              <Text style={styles.actionSheetSubtitle}>
                {selectedEquipo?.tipo} • {selectedEquipo?.marca} {selectedEquipo?.modelo}
              </Text>
            </View>

            <View style={styles.actionSheetButtons}>
              {selectedEquipo?.prestamo_activo ? (
                <TouchableOpacity
                  style={styles.actionSheetButton}
                  onPress={() => {
                    setShowActionSheet(false);
                    setShowDevolverModal(true);
                  }}
                >
                  <MaterialIcons name="keyboard-return" size={24} color="#9ca3af" />
                  <Text style={styles.actionSheetButtonText}>Devolver</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.actionSheetButton}
                  onPress={() => {
                    setShowActionSheet(false);
                    setShowPrestarModal(true);
                  }}
                >
                  <MaterialIcons name="send" size={24} color="#9ca3af" />
                  <Text style={styles.actionSheetButtonText}>Prestar</Text>
                </TouchableOpacity>
              )}

              {user?.rol === 'INFORMATICA' && (
                <TouchableOpacity
                  style={styles.actionSheetButton}
                  onPress={() => {
                    setShowActionSheet(false);
                    setShowEditModal(true);
                  }}
                >
                  <MaterialIcons name="edit" size={24} color="#9ca3af" />
                  <Text style={styles.actionSheetButtonText}>Editar</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.actionSheetButton}
                onPress={async () => {
                  setShowActionSheet(false);
                  try {
                    const qrDataUri = await equiposService.descargarQR(selectedEquipo!.id);
                    setQrImage(qrDataUri);
                    setShowQRModal(true);
                  } catch (error: any) {
                    Alert.alert('Error', error.response?.data?.detail || error.message || 'Error al generar QR');
                  }
                }}
              >
                <MaterialIcons name="qr-code-2" size={24} color="#9ca3af" />
                <Text style={styles.actionSheetButtonText}>Generar QR</Text>
              </TouchableOpacity>

              {user?.rol === 'INFORMATICA' && (
                <TouchableOpacity
                  style={[styles.actionSheetButton, styles.actionSheetButtonDanger]}
                  onPress={() => {
                    setShowActionSheet(false);
                    Alert.alert(
                      'Confirmar eliminación',
                      `¿Estás seguro de eliminar el equipo ${selectedEquipo?.serie}?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Eliminar',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await equiposService.delete(selectedEquipo!.id);
                              queryClient.invalidateQueries({ queryKey: ['equipos'] });
                              queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
                              Alert.alert('Éxito', 'Equipo eliminado');
                              setSelectedEquipo(null);
                            } catch (error: any) {
                              Alert.alert('Error', error.response?.data?.detail || 'Error al eliminar equipo');
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <MaterialIcons name="delete" size={24} color="#dc2626" />
                  <Text style={[styles.actionSheetButtonText, styles.actionSheetButtonTextDanger]}>
                    Eliminar
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionSheetButton, styles.actionSheetButtonCancel]}
                onPress={() => {
                  setShowActionSheet(false);
                  setSelectedEquipo(null);
                }}
              >
                <MaterialIcons name="close" size={24} color="#9ca3af" />
                <Text style={styles.actionSheetButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal QR */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowQRModal(false);
          setQrImage(null);
        }}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={styles.qrModalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Código QR</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowQRModal(false);
                  setQrImage(null);
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {qrImage && (
              <View style={styles.qrContainer}>
                <Image source={{ uri: qrImage }} style={styles.qrImage} resizeMode="contain" />
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={async () => {
                    try {
                      await equiposService.compartirQR(selectedEquipo!.id);
                    } catch (error: any) {
                      Alert.alert('Error', error.message || 'No se pudo compartir el QR');
                    }
                  }}
                >
                  <Text style={styles.shareButtonText}>Compartir QR</Text>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
        </View>
      </Modal>

      {/* Modal Editar Equipo */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowEditModal(false);
          setSelectedEquipo(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Equipo</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedEquipo(null);
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Marca *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ingresa la marca"
                  placeholderTextColor="#6B7280"
                  value={editFormData.marca}
                  onChangeText={(text) => setEditFormData({ ...editFormData, marca: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Modelo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ingresa el modelo"
                  placeholderTextColor="#6B7280"
                  value={editFormData.modelo}
                  onChangeText={(text) => setEditFormData({ ...editFormData, modelo: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tipo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: NOTEBOOK, PC, AIO"
                  placeholderTextColor="#6B7280"
                  value={editFormData.tipo}
                  onChangeText={(text) => setEditFormData({ ...editFormData, tipo: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Estado</Text>
                <View style={styles.radioGroup}>
                  {(['OPERATIVO', 'MANTENCIÓN', 'BAJA'] as const).map((estado) => (
                    <TouchableOpacity
                      key={estado}
                      style={[
                        styles.radioButton,
                        editFormData.estado_dispositivo === estado && styles.radioButtonActive,
                      ]}
                      onPress={() => setEditFormData({ ...editFormData, estado_dispositivo: estado })}
                    >
                      <Text
                        style={[
                          styles.radioText,
                          editFormData.estado_dispositivo === estado && styles.radioTextActive,
                        ]}
                      >
                        {estado}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>RAM (GB)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 8, 16, 32"
                  placeholderTextColor="#6B7280"
                  value={editFormData.ram_gb}
                  onChangeText={(text) => setEditFormData({ ...editFormData, ram_gb: text })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>SSD (GB)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 256, 512, 1024"
                  placeholderTextColor="#6B7280"
                  value={editFormData.ssd_gb}
                  onChangeText={(text) => setEditFormData({ ...editFormData, ssd_gb: text })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Sistema Operativo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Windows 11, Ubuntu 22.04"
                  placeholderTextColor="#6B7280"
                  value={editFormData.so}
                  onChangeText={(text) => setEditFormData({ ...editFormData, so: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Observaciones</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Observaciones adicionales"
                  placeholderTextColor="#6B7280"
                  value={editFormData.observaciones}
                  onChangeText={(text) => setEditFormData({ ...editFormData, observaciones: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => {
                  if (!editFormData.marca.trim() || !editFormData.modelo.trim() || !editFormData.tipo.trim()) {
                    Alert.alert('Error', 'Marca, modelo y tipo son obligatorios');
                    return;
                  }
                  updateMutation.mutate();
                }}
                disabled={updateMutation.isPending}
              >
                <LinearGradient
                  colors={updateMutation.isPending ? ['#6B7280', '#4B5563'] : ['#374151', '#1f2937']}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>
                    {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Prestar Equipo */}
      <Modal
        visible={showPrestarModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowPrestarModal(false);
          setSelectedEquipo(null);
          processedScanRef.current = null; // Limpiar referencia para permitir escanear de nuevo
          setPrestarData({
            trabajador_rut: '',
            estado_entrega_bueno: true,
            estado_entrega_con_cargador: true,
            observaciones_entrega: '',
          });
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Prestar Equipo</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPrestarModal(false);
                  setSelectedEquipo(null);
                  processedScanRef.current = null; // Limpiar referencia para permitir escanear de nuevo
                  setPrestarData({
                    trabajador_rut: '',
                    estado_entrega_bueno: true,
                    estado_entrega_con_cargador: true,
                    observaciones_entrega: '',
                  });
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {selectedEquipo && (
                <View style={styles.equipoInfoBox}>
                  <Text style={styles.equipoInfoText}>Serie: {selectedEquipo.serie}</Text>
                  <Text style={styles.equipoInfoText}>
                    {selectedEquipo.tipo} • {selectedEquipo.marca} {selectedEquipo.modelo}
                  </Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Trabajador *</Text>
                <ScrollView style={styles.trabajadoresList} nestedScrollEnabled>
                  {trabajadores.map((trabajador) => (
                    <TouchableOpacity
                      key={trabajador.rut}
                      style={[
                        styles.trabajadorOption,
                        prestarData.trabajador_rut === trabajador.rut && styles.trabajadorOptionSelected,
                      ]}
                      onPress={() => setPrestarData({ ...prestarData, trabajador_rut: trabajador.rut })}
                    >
                      <Text style={styles.trabajadorOptionText}>{trabajador.nombre}</Text>
                      <Text style={styles.trabajadorOptionRut}>RUT: {trabajador.rut}</Text>
                      <Text style={styles.trabajadorOptionObra}>{trabajador.obra}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Estado de Entrega</Text>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setPrestarData({ ...prestarData, estado_entrega_bueno: !prestarData.estado_entrega_bueno })}
                >
                  <Text style={styles.checkboxText}>
                    {prestarData.estado_entrega_bueno ? '✅' : '☐'} Equipo en buen estado
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setPrestarData({ ...prestarData, estado_entrega_con_cargador: !prestarData.estado_entrega_con_cargador })}
                >
                  <Text style={styles.checkboxText}>
                    {prestarData.estado_entrega_con_cargador ? '✅' : '☐'} Incluye cargador
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Observaciones</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Observaciones de la entrega"
                  placeholderTextColor="#6B7280"
                  value={prestarData.observaciones_entrega}
                  onChangeText={(text) => setPrestarData({ ...prestarData, observaciones_entrega: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => {
                  if (!prestarData.trabajador_rut) {
                    Alert.alert('Error', 'Debes seleccionar un trabajador');
                    return;
                  }
                  prestarMutation.mutate();
                }}
                disabled={prestarMutation.isPending}
              >
                <LinearGradient
                  colors={prestarMutation.isPending ? ['#6B7280', '#4B5563'] : ['#374151', '#1f2937']}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>
                    {prestarMutation.isPending ? 'Prestando...' : 'Confirmar Préstamo'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Devolver Equipo */}
      <Modal
        visible={showDevolverModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowDevolverModal(false);
          setSelectedEquipo(null);
          processedScanRef.current = null; // Limpiar referencia para permitir escanear de nuevo
          setDevolverData({
            estado_devolucion_bueno: true,
            estado_devolucion_con_cargador: true,
            observaciones_devolucion: '',
          });
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Devolver Equipo</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDevolverModal(false);
                  setSelectedEquipo(null);
                  processedScanRef.current = null; // Limpiar referencia para permitir escanear de nuevo
                  setDevolverData({
                    estado_devolucion_bueno: true,
                    estado_devolucion_con_cargador: true,
                    observaciones_devolucion: '',
                  });
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {selectedEquipo && (
                <View style={styles.equipoInfoBox}>
                  <Text style={styles.equipoInfoText}>Serie: {selectedEquipo.serie}</Text>
                  <Text style={styles.equipoInfoText}>
                    {selectedEquipo.tipo} • {selectedEquipo.marca} {selectedEquipo.modelo}
                  </Text>
                  {selectedEquipo.prestamo_activo && (
                    <>
                      <Text style={[styles.equipoInfoText, { marginTop: 8, fontSize: 14 }]}>
                        Prestado a: {selectedEquipo.prestamo_activo.trabajador?.nombre || 'N/A'}
                      </Text>
                      <Text style={[styles.equipoInfoText, { fontSize: 12, color: '#9CA3AF' }]}>
                        RUT: {selectedEquipo.prestamo_activo.trabajador?.rut || 'N/A'}
                      </Text>
                    </>
                  )}
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Estado de Devolución</Text>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setDevolverData({ ...devolverData, estado_devolucion_bueno: !devolverData.estado_devolucion_bueno })}
                >
                  <Text style={styles.checkboxText}>
                    {devolverData.estado_devolucion_bueno ? '✅' : '☐'} Equipo en buen estado
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setDevolverData({ ...devolverData, estado_devolucion_con_cargador: !devolverData.estado_devolucion_con_cargador })}
                >
                  <Text style={styles.checkboxText}>
                    {devolverData.estado_devolucion_con_cargador ? '✅' : '☐'} Incluye cargador
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Observaciones</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Observaciones de la devolución"
                  placeholderTextColor="#6B7280"
                  value={devolverData.observaciones_devolucion}
                  onChangeText={(text) => setDevolverData({ ...devolverData, observaciones_devolucion: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => devolverMutation.mutate()}
                disabled={devolverMutation.isPending}
              >
                <LinearGradient
                  colors={devolverMutation.isPending ? ['#6B7280', '#4B5563'] : ['#374151', '#1f2937']}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>
                    {devolverMutation.isPending ? 'Devolviendo...' : 'Confirmar Devolución'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </KeyboardAvoidingView>
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerRight: {
    width: 40,
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
    backgroundColor: '#111827',
  },
  equiposList: {
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
  equipoCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  equipoCardGradient: {
    padding: 20,
  },
  equipoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  equipoSerie: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  equipoInfo: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  specsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  specText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  prestamoInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  prestamoLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  prestamoText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  ultimoPrestamoInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  ultimoPrestamoLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  ultimoPrestamoText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  ultimoPrestamoFecha: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
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
    elevation: 8,
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
    flex: 1,
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
  modalClose: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  modalForm: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flex: 1,
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
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  radioButtonActive: {
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    borderColor: '#4b5563',
  },
  radioText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  radioTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  actionSheetHeader: {
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  actionSheetTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSheetSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  actionSheetButtons: {
    gap: 12,
  },
  actionSheetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionSheetButtonDanger: {
    backgroundColor: 'rgba(153, 27, 27, 0.2)',
    borderColor: 'rgba(153, 27, 27, 0.4)',
  },
  actionSheetButtonCancel: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderColor: 'rgba(107, 114, 128, 0.3)',
    marginTop: 8,
  },
  actionSheetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  actionSheetButtonTextDanger: {
    color: '#dc2626',
  },
  qrModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  qrContainer: {
    padding: 20,
    alignItems: 'center',
  },
  qrImage: {
    width: 300,
    height: 300,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  shareButton: {
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  equipoInfoBox: {
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.5)',
  },
  equipoInfoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trabajadoresList: {
    maxHeight: 200,
  },
  trabajadorOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  trabajadorOptionSelected: {
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    borderColor: '#4b5563',
  },
  trabajadorOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trabajadorOptionRut: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 2,
  },
  trabajadorOptionObra: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  checkboxText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
  },
});
