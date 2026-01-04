import api from './api'
import { Equipo, EquipoConPrestamo } from '../types'

export const equiposService = {
  getAll: async (params?: { obra?: string; tipo?: string; estado?: string; serie?: string; nombre?: string; busqueda?: string }) => {
    const { data } = await api.get<EquipoConPrestamo[]>('/api/equipos/', { params })
    return data
  },
  
  getLibres: async () => {
    const { data } = await api.get<Equipo[]>('/api/equipos/libres')
    return data
  },
  
  getById: async (id: number) => {
    const { data } = await api.get<EquipoConPrestamo>(`/api/equipos/${id}`)
    return data
  },
  
  create: async (equipo: Partial<Equipo>) => {
    const { data } = await api.post<Equipo>('/api/equipos/', equipo)
    return data
  },
  
  update: async (id: number, equipo: Partial<Equipo>) => {
    const { data } = await api.put<Equipo>(`/api/equipos/${id}`, equipo)
    return data
  },
  
  delete: async (id: number) => {
    await api.delete(`/api/equipos/${id}`)
  },
  
  descargarQR: async (id: number) => {
    const response = await api.get(`/api/equipos/${id}/qr`, {
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `QR_equipo_${id}.png`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
  
  obtenerInfoQR: async (id: number) => {
    const { data } = await api.get(`/api/equipos/qr/${id}/info`)
    return data
  },
}





