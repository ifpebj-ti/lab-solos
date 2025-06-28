import axios, { AxiosError } from 'axios';
import Cookie from 'js-cookie';
import { toast } from '@/components/hooks/use-toast';

export const api = axios.create({
  baseURL: window.env?.VITE_API_URL || 'http://localhost:5000/api/',
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Remove cookies ou tokens armazenados
      Cookie.remove('doorKey');
      Cookie.remove('rankID');
      Cookie.remove('level');

      // Exibe aviso
      toast({
        title: 'Sessão expirada',
        description: 'Por favor, faça login novamente.',
        variant: 'destructive', // ou 'default' se quiser menos impacto visual
      });

      // Redireciona para login
      window.location.href = '/'; // ajuste a rota conforme seu app
    }

    return Promise.reject(error);
  }
);
