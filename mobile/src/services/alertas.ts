import api from './api';

export interface Alerta {
  tipo: string;
  mensaje: string;
  equipo_id?: number;
  trabajador_rut?: string;
}

export const alertasService = {
  async getAll(obra?: string): Promise<Alerta[]> {
    const params: any = {};
    if (obra) params.obra = obra;

    const response = await api.get<Alerta[]>('/api/alertas/', { params });
    return response.data;
  },
};



