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

export const authenticate = async ({ method, params }: IAuth) => {
  try {
    const response = await api({
      method: method,
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
    return response.data;
  } catch (error) {
    console.error('Authentication error ');
    throw error;
  }
};
