import api from './api'

export const reportesService = {
  reportarFalla: async (equipo_id: number, problema: string, foto?: File) => {
    const formData = new FormData()
    formData.append('equipo_id', equipo_id.toString())
    formData.append('problema', problema)
    if (foto) {
      formData.append('foto', foto)
    }
    
    const { data } = await api.post('/api/reportes/falla', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  },
}





