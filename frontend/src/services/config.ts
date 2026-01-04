import api from './api'

export const configService = {
  getObras: async () => {
    const { data } = await api.get<string[]>('/api/config/obras')
    return data
  },
  
  createObra: async (nombre: string) => {
    const { data } = await api.post('/api/config/obras', { nombre })
    return data
  },
  
  deleteObra: async (nombre: string) => {
    await api.delete(`/api/config/obras/${nombre}`)
  },
  
  getTiposEquipos: async () => {
    const { data } = await api.get<string[]>('/api/config/tipos-equipos')
    return data
  },
}

