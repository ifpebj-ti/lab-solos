import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { resolveParentPath } from '@/navigation/profileNavigation';

export interface BackLinkProps {
  readonly pathname?: string;
  readonly role?: string | null;
  readonly profile?: string | null;
  readonly label?: string;
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly children?: ReactNode;
}

function BackLink({
  pathname,
  role,
  profile,
  label = 'Voltar',
  ariaLabel,
  className = 'inline-flex items-center gap-2',
  children,
}: BackLinkProps) {
  const location = useLocation();
  const destination = resolveParentPath(
    pathname ?? location.pathname,
    profile ?? role
  );

  return (
    <Link to={destination} className={className} aria-label={ariaLabel}>
      {children ?? label}
    </Link>
  );
}

export default BackLink;
export { BackLink };
