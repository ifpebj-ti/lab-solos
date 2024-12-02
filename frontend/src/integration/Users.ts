import { api } from '../services/BaseApi';
import Cookie from 'js-cookie';

export const getChallenges = async () => {
  try {
    const doorKey = Cookie.get('doorKey');

    if (!doorKey) {
      throw new Error('DoorKey not found');
    }
    const response = await api({
      method: 'GET',
      url: 'Challenge',
      headers: {
        Authorization: `Bearer ${doorKey}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};
