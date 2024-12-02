import { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Cookie from 'js-cookie';

// Função para verificar se o usuário está autenticado
const isAuthenticated = (): boolean => {
  return !!Cookie.get('doorKey');
};

// Tipo para ranks aceitos
type RankType = string | number; // Ajuste conforme o formato de rank usado
type RequiredRank = RankType[];

// Propriedades esperadas pelo componente PrivateRoute
interface PrivateRouteProps {
  element: ReactElement;
  requiredRank: RequiredRank;
}

// Função para verificar se o usuário possui o rank necessário
const hasRequiredRank = (requiredRank: RequiredRank): boolean => {
  const rankID = Cookie.get('rankID');
  if (!rankID) return false;

  try {
    const parsedRank = JSON.parse(rankID); // Assume que rankID é um JSON armazenado
    if (Array.isArray(parsedRank)) {
      return requiredRank.some((rank) => parsedRank.includes(rank));
    } else {
      return requiredRank.includes(parsedRank);
    }
  } catch (e) {
    console.error('Invalid JSON:', e);
    return false;
  }
};

// Componente PrivateRoute
const PrivateRoute = ({ element, requiredRank }: PrivateRouteProps) => {
  const location = useLocation();

  return isAuthenticated() && hasRequiredRank(requiredRank) ? (
    element
  ) : (
    <Navigate to='/login' state={{ from: location }} replace />
  );
};

export default PrivateRoute;
