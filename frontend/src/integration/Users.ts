import { api } from '../services/BaseApi';
import Cookie from 'js-cookie';

interface IUserById {
  id: string | number;
}

interface IUpdateUserStatus {
  userId: number;
  status: string;
}

export const getRegisteredUsers = async () => {
  try {
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'GET',
      url: 'Usuarios',
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Error fetching users:', error);
    }
    throw error;
  }
};

export const getUserById = async ({ id }: IUserById) => {
  try {
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }
    const response = await api({
      method: 'GET',
      url: `Usuarios/${id}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Error fetching user:', error);
    }
    throw error;
  }
};

export const updateUserStatus = async ({
  userId,
  status,
}: IUpdateUserStatus) => {
  try {
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }

    const response = await api({
      method: 'PATCH',
      url: `Usuarios/${userId}`,
      headers: {
        Authorization: `Bearer ${doorKey}`,
        'Content-Type': 'application/json-patch+json',
      },
      data: [
        {
          op: 'replace',
          path: '/status',
          value: status,
        },
      ],
    });
    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Error updating user status:', error);
    }
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('Usuário não autenticado.');
    }

    // Decodificar o token para obter o ID do usuário
    const base64Url = doorKey.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    const userId = payload.sub;

    // Buscar dados completos do usuário
    return await getUserById({ id: userId });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Error getting current user:', error);
    }
    throw error;
  }
};
