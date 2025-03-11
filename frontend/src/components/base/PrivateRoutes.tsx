import { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Cookie from 'js-cookie';

// Função para verificar se o usuário está autenticado
const isAuthenticated = (): boolean => !!Cookie.get('doorKey');

// Tipo para ranks aceitos
type RankType = string | number;
type RequiredRank = RankType[];

// Propriedades esperadas pelo componente PrivateRoute
interface PrivateRouteProps {
  element: ReactElement;
  requiredRank: RequiredRank;
}

// Função para verificar se o usuário possui o rank necessário
const hasRequiredRank = (requiredRank: RequiredRank): boolean => {
  const rankID = Cookie.get('level');
  if (!rankID) return false;
  return requiredRank.includes(rankID); // Remove JSON.parse
};

// Componente PrivateRoute
const PrivateRoute = ({ element, requiredRank }: PrivateRouteProps) => {
  const location = useLocation();

  return isAuthenticated() && hasRequiredRank(requiredRank) ? (
    element
  ) : (
    <Navigate to='/' state={{ from: location }} replace />
  );
};

export default PrivateRoute;
