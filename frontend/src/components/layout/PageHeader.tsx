import type { ReactNode } from 'react';
import { useId } from 'react';

import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: ReactNode;
  context?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

function PageHeader({
  title,
  context,
  description,
  action,
  actions,
  className,
}: PageHeaderProps) {
  const titleId = useId();
  const resolvedContext = context ?? description;
  const resolvedActions = actions ?? action;

  return (
    <header
      aria-labelledby={titleId}
      className={cn(
        'flex w-full min-w-0 flex-col gap-4 border-b border-borderMy pb-4 md:flex-row md:items-end md:justify-between',
        className
      )}
    >
      <div className='min-w-0'>
        <h1
          id={titleId}
          className='min-w-0 font-rajdhani-semibold text-3xl leading-tight text-clt-2 [overflow-wrap:anywhere]'
        >
          {title}
        </h1>
        {resolvedContext ? (
          <p className='mt-1 max-w-prose text-sm leading-6 text-clt-1 [overflow-wrap:anywhere]'>
            {resolvedContext}
          </p>
        ) : null}
      </div>
      {resolvedActions ? (
        <div className='flex min-w-0 max-w-full flex-wrap items-center gap-2'>
          {resolvedActions}
        </div>
      ) : null}
    </header>
  );
}

export default PageHeader;
