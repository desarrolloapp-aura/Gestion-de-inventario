import api from './api'
import { Trabajador } from '../types'

export const trabajadoresService = {
  getAll: async (params?: { obra?: string; activo?: boolean }) => {
    const { data } = await api.get<Trabajador[]>('/api/trabajadores/', { params })
    return data
  },
  
  getByRut: async (rut: string) => {
    const { data } = await api.get<Trabajador>(`/api/trabajadores/${rut}`)
    return data
  },
  
  create: async (trabajador: Partial<Trabajador>) => {
    const { data } = await api.post<Trabajador>('/api/trabajadores/', trabajador)
    return data
  },
  
  update: async (rut: string, trabajador: Partial<Trabajador>) => {
    const { data } = await api.put<Trabajador>(`/api/trabajadores/${rut}`, trabajador)
    return data
  },
  
  marcarDespido: async (rut: string) => {
    const { data } = await api.put(`/api/trabajadores/${rut}/despido`)
    return data
  },
}





