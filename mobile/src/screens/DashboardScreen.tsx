import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { estadisticasService } from '../services/estadisticas';
import { alertasService } from '../services/alertas';
import { equiposService, Equipo } from '../services/equipos';
import { configService } from '../services/config';
import { prestamosService } from '../services/prestamos';
import { trabajadoresService } from '../services/trabajadores';
import { useAuth } from '../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Path, Circle, Line, Text as SvgText, G, Defs, LinearGradient as SvgLinearGradient, Stop, TSpan } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [obraFilter, setObraFilter] = useState('');
  const [serieSearch, setSerieSearch] = useState('');
  const [mostrarRegresion, setMostrarRegresion] = useState(false);
  const [showPrestarModal, setShowPrestarModal] = useState(false);
  const [selectedEquipo, setSelectedEquipo] = useState<Equipo | null>(null);
  const [prestarData, setPrestarData] = useState({
    trabajador_rut: '',
    estado_entrega_bueno: true,
    estado_entrega_con_cargador: true,
    observaciones_entrega: '',
  });

  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => estadisticasService.getDashboard(),
    refetchInterval: 30000,
  });

  const { data: alertas = [] } = useQuery({
    queryKey: ['alertas', obraFilter],
    queryFn: () => alertasService.getAll(obraFilter || undefined),
  });

  const { data: equipos = [], isLoading: loadingEquipos } = useQuery({
    queryKey: ['equipos', obraFilter, serieSearch],
    queryFn: () => equiposService.getAll({ obra: obraFilter || undefined, serie: serieSearch || undefined }),
  });

  const { data: obras = [] } = useQuery({
    queryKey: ['obras'],
    queryFn: () => configService.getObras(),
  });

  const { data: trabajadores = [] } = useQuery({
    queryKey: ['trabajadores-activos'],
    queryFn: () => trabajadoresService.getAll({ activo: true }),
    enabled: showPrestarModal,
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
      setPrestarData({
        trabajador_rut: '',
        estado_entrega_bueno: true,
        estado_entrega_con_cargador: true,
        observaciones_entrega: '',
      });
    },
    onError: (error: any) => {
      console.error('[DashboardScreen] Error al prestar:', error);
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
    },
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats()]);
    setRefreshing(false);
  }, [refetchStats]);

  const alertasUrgentes = alertas.filter(
    (a) => a.tipo === 'VENCIDO' || a.tipo === 'DESPIDO'
  );

  const cards = [
    {
      title: 'Total Equipos',
      value: stats?.resumen?.total_equipos || 0,
      gradient: ['#1e293b', '#0f172a'], // slate-800/60 to slate-900/80
      accentColor: '#22d3ee', // cyan-400
      icon: '💻',
    },
    {
      title: 'Préstamos Activos',
      value: stats?.resumen?.prestamos_activos || 0,
      gradient: ['#1e293b', '#0f172a'], // slate-800/60 to slate-900/80
      accentColor: '#34d399', // emerald-400
      icon: '📦',
    },
    {
      title: 'Trabajadores Activos',
      value: stats?.resumen?.trabajadores_activos || 0,
      gradient: ['#1e293b', '#0f172a'], // slate-800/60 to slate-900/80
      accentColor: '#a78bfa', // violet-400
      icon: '👥',
    },
    {
      title: 'Alertas Pendientes',
      value: stats?.resumen?.alertas_pendientes || 0,
      gradient: ['#1e293b', '#0f172a'], // slate-800/60 to slate-900/80
      accentColor: '#fbbf24', // amber-400
      icon: '⚠️',
    },
  ];

  // Datos para gráfico de regresión
  const datosRegresion = stats?.prestamos_por_mes?.[0]?.por_dia || [];
  const hoy = new Date();
  const diaActual = hoy.getDate();
  const datosCompletos = [];
  for (let dia = 1; dia <= diaActual; dia++) {
    const datoExistente = datosRegresion.find((d: any) => d.dia === dia);
    datosCompletos.push({
      dia: dia,
      cantidad: datoExistente ? datoExistente.cantidad : 0
    });
  }

  // Calcular regresión lineal
  let pendiente = 0;
  let intercepto = 0;
  let rCuadrado = 0;
  if (datosCompletos.length > 0) {
    const n = datosCompletos.length;
    const sumX = datosCompletos.reduce((sum, d) => sum + d.dia, 0);
    const sumY = datosCompletos.reduce((sum, d) => sum + d.cantidad, 0);
    const sumXY = datosCompletos.reduce((sum, d) => sum + d.dia * d.cantidad, 0);
    const sumX2 = datosCompletos.reduce((sum, d) => sum + d.dia * d.dia, 0);
    const denominador = (n * sumX2 - sumX * sumX);
    pendiente = denominador !== 0 ? (n * sumXY - sumX * sumY) / denominador : 0;
    intercepto = (sumY - pendiente * sumX) / n;
    const yPromedio = sumY / n;
    const ssRes = datosCompletos.reduce((sum, d) => {
      const yPredicho = pendiente * d.dia + intercepto;
      return sum + Math.pow(d.cantidad - yPredicho, 2);
    }, 0);
    const ssTot = datosCompletos.reduce((sum, d) => sum + Math.pow(d.cantidad - yPromedio, 2), 0);
    rCuadrado = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
  }

  const maxCantidad = Math.max(...datosCompletos.map((d: any) => d.cantidad), 1);
  const puntosRegresion = [];
  for (let dia = 1; dia <= diaActual; dia++) {
    const y = pendiente * dia + intercepto;
    puntosRegresion.push({ x: dia, y: Math.max(0, y) });
  }
  const maxYRegresion = Math.max(...puntosRegresion.map((p: any) => p.y), maxCantidad);
  const maxY = Math.max(maxCantidad, maxYRegresion);

  // Datos para gráfico de torta
  const dispositivosMasUsados = stats?.dispositivos_mas_usados || [];
  const totalDispositivos = dispositivosMasUsados.reduce((sum: number, d: any) => sum + d.cantidad, 0);

  const getStatusColor = (estado: string) => {
    // Todos los estados usan el mismo color gris oscuro profesional
    return ['#374151', '#1f2937'];
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.welcomeText}>Dashboard</Text>
            <Text style={styles.subtitleText}>Vista general de equipos y alertas</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <MaterialIcons name="logout" size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6b7280" />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Cards de estadísticas */}
          <View style={styles.cardsGrid}>
            {cards.map((card, index) => (
              <TouchableOpacity key={index} style={styles.cardContainer}>
                <LinearGradient
                  colors={card.gradient}
                  style={styles.card}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={[styles.cardValue, { color: card.accentColor }]}>{card.value}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* Alertas urgentes */}
          {alertasUrgentes.length > 0 && (
            <View style={styles.alertasContainer}>
              <Text style={styles.alertasTitle}>🚨 ALERTAS URGENTES</Text>
              {alertasUrgentes.map((alerta, idx) => (
                <View key={idx} style={styles.alertaCard}>
                  <Text style={styles.alertaText}>{alerta.mensaje}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Filtros */}
          <View style={styles.filtersContainer}>
            <View style={styles.filterRow}>
              <TextInput
                style={styles.filterInput}
                placeholder="Buscar por serie..."
                placeholderTextColor="#6B7280"
                value={serieSearch}
                onChangeText={setSerieSearch}
              />
            </View>
          </View>

          {/* Gráfico de Regresión Lineal */}
          {datosCompletos.length > 0 && (
            <View style={styles.chartContainer}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>📊 Préstamos del Mes</Text>
                <TouchableOpacity
                  style={styles.regresionButton}
                  onPress={() => setMostrarRegresion(!mostrarRegresion)}
                >
                  <Text style={styles.regresionButtonText}>
                    {mostrarRegresion ? 'Ocultar' : 'Mostrar'} Regresión
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chartContent}>
                <Svg width={width - 80} height={250} viewBox={`0 0 ${width - 80} 250`}>
                  <Defs>
                    <SvgLinearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <Stop offset="0%" stopColor="rgba(255, 107, 53, 0.8)" />
                      <Stop offset="100%" stopColor="rgba(255, 107, 53, 1)" />
                    </SvgLinearGradient>
                  </Defs>
                  
                  {/* Ejes */}
                  <Line x1="40" y1="20" x2="40" y2="220" stroke="#6B7280" strokeWidth="2" />
                  <Line x1="40" y1="220" x2={width - 120} y2="220" stroke="#6B7280" strokeWidth="2" />
                  
                  {/* Puntos de datos */}
                  {datosCompletos.map((d: any, i: number) => {
                    const x = 40 + ((d.dia - 1) / (diaActual - 1)) * (width - 160);
                    const y = 220 - (d.cantidad / maxY) * 200;
                    return (
                      <G key={i}>
                        <Circle cx={x} cy={y} r="6" fill="url(#lineGradient)" stroke="#1F2937" strokeWidth="2" />
                        {d.cantidad > 0 && (
                          <SvgText x={x} y={y - 12} fill="#F3F4F6" fontSize="10" textAnchor="middle" fontWeight="bold">
                            {d.cantidad}
                          </SvgText>
                        )}
                      </G>
                    );
                  })}
                  
                  {/* Línea de regresión */}
                  {mostrarRegresion && puntosRegresion.length > 1 && (
                    <Path
                      d={`M ${puntosRegresion.map((p: any, i: number) => {
                        const x = 40 + ((p.x - 1) / (diaActual - 1)) * (width - 160);
                        const y = 220 - (p.y / maxY) * 200;
                        return i === 0 ? `${x} ${y}` : `L ${x} ${y}`;
                      }).join(' ')}`}
                      stroke="#3B82F6"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray="8,4"
                    />
                  )}
                </Svg>
                {mostrarRegresion && (
                  <View style={styles.regresionInfo}>
                    <Text style={styles.regresionInfoText}>
                      Pendiente: {pendiente.toFixed(3)} | R²: {(rCuadrado * 100).toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Gráfico de Torta */}
          {dispositivosMasUsados.length > 0 && totalDispositivos > 0 && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>🥧 Dispositivos Más Usados</Text>
              <View style={styles.pieChartContainer}>
                <Svg width={200} height={200} viewBox="0 0 200 200">
                  {(() => {
                    let anguloInicio = -90;
                    const segmentos = [];
                    dispositivosMasUsados.forEach((item: any) => {
                      if (item.cantidad > 0) {
                        const porcentaje = (item.cantidad / totalDispositivos) * 100;
                        const angulo = (porcentaje / 100) * 360;
                        const anguloFin = anguloInicio + angulo;
                        const inicioRad = (anguloInicio * Math.PI) / 180;
                        const finRad = (anguloFin * Math.PI) / 180;
                        const x1 = 100 + 70 * Math.cos(inicioRad);
                        const y1 = 100 + 70 * Math.sin(inicioRad);
                        const x2 = 100 + 70 * Math.cos(finRad);
                        const y2 = 100 + 70 * Math.sin(finRad);
                        const largeArcFlag = angulo > 180 ? 1 : 0;
                        const pathData = `M 100 100 L ${x1} ${y1} A 70 70 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                        segmentos.push({ pathData, color: item.color, nombre: item.nombre, cantidad: item.cantidad, porcentaje });
                        anguloInicio = anguloFin;
                      }
                    });
                    return segmentos.map((seg, idx) => (
                      <Path key={idx} d={seg.pathData} fill={seg.color} stroke="#1F2937" strokeWidth="2" />
                    ));
                  })()}
                </Svg>
                <View style={styles.pieLegend}>
                  {dispositivosMasUsados.filter((d: any) => d.cantidad > 0).map((item: any, idx: number) => (
                    <View key={idx} style={styles.pieLegendItem}>
                      <View style={[styles.pieLegendColor, { backgroundColor: item.color }]} />
                      <Text style={styles.pieLegendText}>{item.nombre}</Text>
                      <Text style={styles.pieLegendValue}>{item.cantidad}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Grid de Equipos */}
          <Text style={styles.sectionTitle}>Equipos</Text>
          {loadingEquipos ? (
            <Text style={styles.loadingText}>Cargando equipos...</Text>
          ) : equipos.length > 0 ? (
            <View style={styles.equiposGrid}>
              {equipos.slice(0, 6).map((equipo: Equipo) => (
                <TouchableOpacity
                  key={equipo.id}
                  style={styles.equipoCard}
                  onPress={() => {
                    if (equipo.prestamo_activo) {
                      navigation.navigate('Equipos');
                    } else {
                      setSelectedEquipo(equipo);
                      setShowPrestarModal(true);
                    }
                  }}
                >
                  <LinearGradient
                    colors={getStatusColor(equipo.estado_dispositivo)}
                    style={styles.equipoCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.equipoSerie}>{equipo.serie}</Text>
                    <Text style={styles.equipoInfo}>
                      {equipo.tipo} • {equipo.marca}
                    </Text>
                    {equipo.prestamo_activo && (
                      <Text style={styles.equipoPrestado}>
                        Prestado a: {equipo.prestamo_activo.trabajador?.nombre || 'N/A'}
                      </Text>
                    )}
                    {!equipo.prestamo_activo && equipo.ultimo_prestamo_devuelto && (
                      <View style={styles.ultimoPrestamoContainer}>
                        <Text style={styles.ultimoPrestamoLabel}>Último préstamo:</Text>
                        <Text style={styles.ultimoPrestamoText}>
                          {equipo.ultimo_prestamo_devuelto.trabajador?.nombre || 'N/A'}
                        </Text>
                        {equipo.ultimo_prestamo_devuelto.fecha_devolucion && (
                          <Text style={styles.ultimoPrestamoFecha}>
                            {new Date(equipo.ultimo_prestamo_devuelto.fecha_devolucion).toLocaleString('es-CL', {
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
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No hay equipos disponibles</Text>
          )}

          {equipos.length > 6 && (
            <TouchableOpacity
              style={styles.verMasButton}
              onPress={() => navigation.navigate('Equipos')}
            >
              <Text style={styles.verMasText}>Ver todos los equipos →</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Modal Prestar Equipo */}
      <Modal
        visible={showPrestarModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowPrestarModal(false);
          setSelectedEquipo(null);
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
            style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 8) + 40 }]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Prestar Equipo</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPrestarModal(false);
                  setSelectedEquipo(null);
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
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitleText: {
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '400',
    lineHeight: 20,
  },
  logoutButton: {
    padding: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
    backgroundColor: '#111827',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  cardContainer: {
    width: (width - 56) / 2,
  },
  card: {
    borderRadius: 12,
    padding: 24,
    minHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)', // slate-700/50
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 14,
    color: '#9CA3AF', // gray-400
    fontWeight: '500',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  alertasContainer: {
    marginBottom: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  alertasTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 12,
  },
  alertaCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  alertaText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  filtersContainer: {
    marginBottom: 24,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  chartContainer: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  regresionButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  regresionButtonText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
  chartContent: {
    alignItems: 'center',
  },
  regresionInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  regresionInfoText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
  pieChartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  pieLegend: {
    marginLeft: 20,
    gap: 8,
  },
  pieLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pieLegendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  pieLegendText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
  pieLegendValue: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  equiposGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  equipoCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  equipoCardGradient: {
    padding: 16,
  },
  equipoSerie: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  equipoInfo: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  equipoPrestado: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  verMasButton: {
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  verMasText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
  },
  emptyText: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
  },
  ultimoPrestamoContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  ultimoPrestamoLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  ultimoPrestamoText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  ultimoPrestamoFecha: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
