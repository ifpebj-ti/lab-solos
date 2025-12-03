import axios, { AxiosError } from 'axios';
import Cookie from 'js-cookie';
import { toast } from '@/components/hooks/use-toast';

export const api = axios.create({
  baseURL: window.env?.VITE_API_URL || 'http://localhost:8080/api/',
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Só redireciona se não estiver na página de login
      const currentPath = window.location.pathname;
      const isLoginPage = currentPath === '/' || currentPath === '/login';

      if (!isLoginPage) {
        // Remove cookies ou tokens armazenados
        Cookie.remove('doorKey');
        Cookie.remove('rankID');
        Cookie.remove('level');

        // Exibe aviso
        toast({
          title: 'Sessão expirada',
          description: 'Por favor, faça login novamente.',
          variant: 'destructive',
        });

        // Redireciona para login apenas se não estiver na página de login
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);
