import { ReactElement } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { clearSession, readSession } from '@/auth/session';
import BackLink from '@/components/global/BackLink';
import { ERROR_CATALOG } from '@/errors/errorCatalog';

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

const SUPPORTED_ROLES = new Set(['Administrador', 'Mentor', 'Mentorado']);

interface AccessDeniedProps {
  readonly pathname: string;
  readonly role: string;
}

const AccessDenied = ({ pathname, role }: AccessDeniedProps) => {
  const navigate = useNavigate();

  if (!SUPPORTED_ROLES.has(role)) {
    return (
      <main>
        <h1>Acesso indisponível</h1>
        <p>Este nível de acesso não possui um módulo disponível.</p>
        <button
          type='button'
          onClick={() => {
            clearSession({ discardAuthContext: true });
            navigate('/');
          }}
        >
          Sair
        </button>
      </main>
    );
  }

  return (
    <main>
      <h1>Acesso negado</h1>
      <p>{ERROR_CATALOG.authorization.message}</p>
      <p>{ERROR_CATALOG.authorization.suggestedAction}</p>
      <BackLink pathname={pathname} role={role}>
        Voltar para minha área
      </BackLink>
    </main>
  );
};

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

  if (!session) {
    return <Navigate to='/' state={{ from: location }} replace />;
  }

  if (hasRequiredRank(requiredRank, session.role)) return element;

  return <AccessDenied pathname={location.pathname} role={session.role} />;
};

export default PrivateRoute;
