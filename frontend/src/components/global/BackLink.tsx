import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

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
  className = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-borderMy text-clt-2 transition-colors hover:bg-surface-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
  children,
}: BackLinkProps) {
  const location = useLocation();
  const destination = resolveParentPath(
    pathname ?? location.pathname,
    profile ?? role
  );
  const accessibleLabel = ariaLabel ?? (children ? undefined : label);

  return (
    <Link
      to={destination}
      className={className}
      aria-label={accessibleLabel}
      title={accessibleLabel}
    >
      {children ?? <ArrowLeft aria-hidden='true' className='h-5 w-5' />}
    </Link>
  );
}

export default BackLink;
export { BackLink };
