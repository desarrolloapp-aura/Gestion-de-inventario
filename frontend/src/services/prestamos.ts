import api from './api'
import { Prestamo } from '../types'

export const prestamosService = {
  getAll: async (params?: { obra?: string; estado?: string }) => {
    const { data } = await api.get<Prestamo[]>('/api/prestamos/', { params })
    return data
  },
  
  getByRut: async (rut: string) => {
    const { data } = await api.get<Prestamo[]>(`/api/prestamos/rut/${rut}`)
    return data
  },
  
  create: async (prestamo: { 
    equipo_id: number; 
    trabajador_rut: string; 
    obra: string;
    estado_entrega_bueno: boolean;
    estado_entrega_con_cargador: boolean;
    observaciones_entrega?: string;
  }) => {
    const { data } = await api.post<Prestamo>('/api/prestamos/', prestamo)
    return data
  },
  
  devolver: async (id: number, devolucion: {
    estado_devolucion_bueno: boolean;
    estado_devolucion_con_cargador: boolean;
    observaciones_devolucion?: string;
  }) => {
    const { data } = await api.put<Prestamo>(`/api/prestamos/${id}/devolver`, devolucion)
    return data
  },
  
  getById: async (id: number) => {
    const { data } = await api.get<Prestamo>(`/api/prestamos/${id}`)
    return data
  },
  
  marcarCargadorDevuelto: async (id: number) => {
    const { data } = await api.put<Prestamo>(`/api/prestamos/${id}/marcar-cargador-devuelto`)
    return data
  },
  
  getAlertasTrabajador: async (rut: string) => {
    const { data } = await api.get<any[]>(`/api/prestamos/trabajador/${rut}/alertas`)
    return data
  },
  
  delete: async (id: number) => {
    await api.delete(`/api/prestamos/${id}`)
  },
}





