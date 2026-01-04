import api from './api'
import { Alerta } from '../types'

export const alertasService = {
  getAll: async (obra?: string) => {
    const { data } = await api.get<Alerta[]>('/api/alertas/', { params: { obra } })
    return data
  },
}





