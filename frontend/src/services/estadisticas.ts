import api from './api'

export interface DashboardStats {
  resumen: {
    total_equipos: number
    equipos_operativos: number
    equipos_mantenimiento: number
    prestamos_activos: number
    trabajadores_activos: number
    prestamos_recientes: number
    alertas_pendientes: number
  }
  prestamos_por_mes: Array<{
    mes: string
    cantidad: number
    por_dia?: Array<{
      dia: number
      cantidad: number
    }>
  }>
  equipos_mas_prestados: Array<{
    serie: string
    tipo: string
    cantidad: number
  }>
  dispositivos_mas_usados: Array<{
    nombre: string
    cantidad: number
    color: string
  }>
}

export const estadisticasService = {
  getDashboard: async () => {
    const { data } = await api.get<DashboardStats>('/api/estadisticas/dashboard')
    return data
  },
}

