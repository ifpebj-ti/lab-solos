import { api } from '../services/BaseApi';
import Cookie from 'js-cookie';

import { OPERATION_IDS } from '@/errors/errorCatalog';
import { reportAppError } from '@/errors/reportAppError';

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
    throw reportAppError(error, OPERATION_IDS.systemQuantities);
  }
};
