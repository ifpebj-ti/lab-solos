import { api } from '../services/BaseApi';
import Cookie from 'js-cookie';

export const getSystemQuantities = async () => {
  try {
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'GET',
      url: `System/quantities`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return response;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Error fetching products:', error);
    }
    throw error;
  }
};
