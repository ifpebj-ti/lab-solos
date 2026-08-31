import { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { readSession } from '@/auth/session';

interface PasswordChangeRequiredRouteProps {
  element: ReactElement;
}

function PasswordChangeRequiredRoute({
  element,
}: PasswordChangeRequiredRouteProps) {
  const location = useLocation();
  const session = readSession();

  return session?.requiresPasswordChange ? (
    element
  ) : (
    <Navigate to='/' state={{ from: location }} replace />
  );
}

export default PasswordChangeRequiredRoute;
