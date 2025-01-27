// useUser.ts
import { useContext } from 'react';
import { UserContext } from './UserProvider'; // Atualize o caminho conforme sua estrutura

export const useUser = () => useContext(UserContext);
