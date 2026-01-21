import api from './api';

export interface MensajeAsistente {
  respuesta: string;
  sugerencias: string[];
}

export interface MensajeHistorial {
  tipo: 'usuario' | 'asistente';
  texto: string;
}

export const asistenteService = {
  chat: async (mensaje: string, historial: MensajeHistorial[] = []): Promise<MensajeAsistente> => {
    const { data } = await api.post<MensajeAsistente>('/api/asistente/chat', {
      mensaje: mensaje,
      historial: historial
    });
    return data;
  },
};



