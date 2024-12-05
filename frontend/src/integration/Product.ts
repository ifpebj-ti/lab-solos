import { api } from '../services/BaseApi';
import Cookie from 'js-cookie';

interface IGetProductById {
  id: number;
}

export const getProductById = async ({ id }: IGetProductById) => {
  try {
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'GET',
      url: `Produtos/${id}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};
