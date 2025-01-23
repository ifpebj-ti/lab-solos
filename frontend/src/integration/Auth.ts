import { AxiosError } from 'axios';
import { api } from '../services/BaseApi';
import Cookie from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

// login

interface IAuthParams {
  email: string;
  password: string;
}

interface IAuth {
  method: string;
  params: IAuthParams;
}

interface ICreateUserData {
  nomeCompleto: string;
  email: string;
  senha: string;
  telefone: string;
  nivelUsuario: string;
  tipoUsuario: string;
  instituicao: string;
  cidade: string;
  curso: string;
}
export const authenticate = async ({ method, params }: IAuth) => {
  try {
    const response = await api({
      method,
      url: 'Auth/login',
      data: params,
    });

    const doorKey = response.data.token;
    if (doorKey) {
      Cookie.set('doorKey', doorKey, {
        secure: true,
        sameSite: 'Strict',
      });
      const decoded = jwtDecode(doorKey);
      Cookie.set('rankID', JSON.stringify(decoded.sub), {
        secure: true,
        sameSite: 'Strict',
      });
    }

    return response; // Retorna a resposta completa para analisar o status no front-end
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      // Retorna informações relevantes do erro da API
      throw error.response || error;
    } else {
      // Erro desconhecido
      throw new Error('Erro inesperado');
    }
  }
};

export const createMentor = async (data: ICreateUserData) => {
  try {
    const response = await api.post('/Usuarios', data);
    return response.data;
  } catch (error) {
    console.error('Error creating mentor:', error);
    throw error;
  }
};
