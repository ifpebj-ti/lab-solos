import { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { readSession } from '@/auth/session';

// Tipo para ranks aceitos
type RankType = string | number;
type RequiredRank = RankType[];

// Propriedades esperadas pelo componente PrivateRoute
interface PrivateRouteProps {
  element: ReactElement;
  requiredRank: RequiredRank;
}

// Função para verificar se o usuário possui o rank necessário
const hasRequiredRank = (
  requiredRank: RequiredRank,
  role: string
): boolean => requiredRank.includes(role);

// Componente PrivateRoute
const PrivateRoute = ({ element, requiredRank }: PrivateRouteProps) => {
  const location = useLocation();
  const session = readSession();

  if (session?.requiresPasswordChange) {
    return (
      <Navigate
        to='/change-password-required'
        state={{ from: location }}
        replace
      />
    );
  }

  return session && hasRequiredRank(requiredRank, session.role) ? (
    element
  ) : (
    <Navigate to='/' state={{ from: location }} replace />
  );
};

export default PrivateRoute;
