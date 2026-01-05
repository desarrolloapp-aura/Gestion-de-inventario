import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configService } from '../services/config';
import { useAuth } from '../context/AuthContext';

export default function ObrasScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [nuevaObra, setNuevaObra] = useState('');
  const queryClient = useQueryClient();

  const { data: obras = [], isLoading, refetch } = useQuery({
    queryKey: ['obras'],
    queryFn: () => configService.getObras(),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (nombre: string) => configService.createObra(nombre),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      queryClient.invalidateQueries({ queryKey: ['equipos'] });
      queryClient.invalidateQueries({ queryKey: ['trabajadores'] });
      Alert.alert('Éxito', 'Obra creada exitosamente');
      setShowModal(false);
      setNuevaObra('');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail || 'Error al crear obra');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (nombre: string) => configService.deleteObra(nombre),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      queryClient.invalidateQueries({ queryKey: ['equipos'] });
      queryClient.invalidateQueries({ queryKey: ['trabajadores'] });
      Alert.alert('Éxito', 'Obra eliminada exitosamente');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail || 'Error al eliminar obra');
    },
  });

  const filteredObras = obras.filter((obra) => {
    if (!search || !search.trim()) return true;
    return obra.toLowerCase().includes(search.toLowerCase());
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCreate = () => {
    if (!nuevaObra.trim()) {
      Alert.alert('Error', 'El nombre de la obra es requerido');
      return;
    }
    createMutation.mutate(nuevaObra.trim());
  };

  const handleDelete = (nombre: string) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de eliminar la obra "${nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(nombre),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.screenTitle}>Obras</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar obra..."
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
        <View style={styles.obrasList}>
          {isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.loadingText}>Cargando obras...</Text>
            </View>
          ) : filteredObras.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {search ? 'No se encontraron obras' : 'No hay obras disponibles'}
              </Text>
              <Text style={styles.emptySubtext}>
                {search ? 'Intenta con otra búsqueda' : user?.rol === 'INFORMATICA' ? 'Crea tu primera obra con el botón +' : ''}
              </Text>
            </View>
          ) : (
            filteredObras.map((obra, index) => (
              <TouchableOpacity
                key={index}
                style={styles.obraCard}
                onLongPress={() => {
                  if (user?.rol === 'INFORMATICA') {
                    handleDelete(obra);
                  }
                }}
              >
                <LinearGradient
                  colors={['#374151', '#1f2937']}
                  style={styles.obraCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.obraText}>{obra}</Text>
                  {user?.rol === 'INFORMATICA' && (
                    <Text style={styles.obraHint}>Mantén presionado para eliminar</Text>
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

      {/* Modal Crear Obra */}
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
              <Text style={styles.modalTitle}>Crear Obra</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre de la Obra *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Obra Central, Proyecto Norte"
                  placeholderTextColor="#6B7280"
                  value={nuevaObra}
                  onChangeText={setNuevaObra}
                  autoCapitalize="words"
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
                    {createMutation.isPending ? 'Creando...' : 'Crear Obra'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
  },
  obrasList: {
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
  obraCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  obraCardGradient: {
    padding: 20,
  },
  obraText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  obraHint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
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
});
