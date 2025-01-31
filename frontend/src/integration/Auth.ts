import { AxiosError } from 'axios';
import { api } from '../services/BaseApi';
import Cookie from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { NavigateFunction } from 'react-router-dom';

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

// Interface para decodificação do token
interface JwtPayload {
  sub: string; // ID ou nível do usuário
  role?: string; // Caso tenha uma role específica
}

export const authenticate = async (
  { method, params }: IAuth,
  navigate: NavigateFunction
) => {
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

      const decoded = jwtDecode<JwtPayload>(doorKey);
      if (decoded.sub) {
        Cookie.set('rankID', decoded.sub, {
          secure: true,
          sameSite: 'Strict',
        });

        // Redirecionamento com base no nível do usuário
        switch (decoded.sub) {
          case '1':
            navigate('/dashboard-admin');
            break;
          case '2':
            navigate('/dashboard-user');
            break;
          default:
            navigate('/');
            break;
        }
      } else {
        console.error('Erro: o valor de "sub" está indefinido.');
      }
    }
    return response;
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      throw error.response || error;
    } else {
      throw new Error('Erro inesperado');
    }
  }
};

export const createMentor = async (data: ICreateUserData) => {
  try {
    const response = await api.post('/Usuarios', data);
    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao criar mentor', error);
    }
    throw error;
  }
};
