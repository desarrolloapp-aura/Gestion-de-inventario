import api from './api';

export const estadisticasService = {
  async getDashboard(): Promise<any> {
    const response = await api.get('/api/estadisticas/dashboard');
    return response.data;
  },
};



