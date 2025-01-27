// UserProvider.tsx
import React, { createContext, useState, useEffect } from 'react';
import Cookie from 'js-cookie';

interface UserContextProps {
  rankID: number | null;
}

export const UserContext = createContext<UserContextProps>({ rankID: null });

export const UserProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [rankID, setRankID] = useState<number | null>(null);

  useEffect(() => {
    const rawRankID = Cookie.get('rankID');

    if (rawRankID) {
      try {
        const parsedRankID = JSON.parse(rawRankID);
        setRankID(parsedRankID);
      } catch (error) {
        console.error('Erro ao parsear rankID:', error);
        setRankID(null);
      }
    } else {
      console.warn('rankID não encontrado no cookie.');
      setRankID(null);
    }
  }, []);

  return (
    <UserContext.Provider value={{ rankID }}>{children}</UserContext.Provider>
  );
};
