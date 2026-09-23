import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CollectionFeedbackState =
  | 'loading'
  | 'empty'
  | 'initial-empty'
  | 'filtered-empty'
  | 'filter-empty'
  | 'error'
  | 'refreshing';

export interface CollectionFeedbackProps {
  state?: CollectionFeedbackState;
  status?: CollectionFeedbackState;
  message?: ReactNode;
  children?: ReactNode;
  onRetry?: () => void;
  onClearFilter?: () => void;
  className?: string;
}

const stateCopy = {
  loading: 'Carregando registros…',
  empty: 'Nenhum registro disponível.',
  'initial-empty': 'Nenhum registro disponível.',
  'filtered-empty': 'Nenhum registro corresponde ao filtro.',
  'filter-empty': 'Nenhum registro corresponde ao filtro.',
  error: 'Não foi possível carregar os registros.',
  refreshing: 'Atualizando registros…',
} satisfies Record<CollectionFeedbackState, string>;

function CollectionFeedback({
  state,
  status,
  message,
  children,
  onRetry,
  onClearFilter,
  className,
}: CollectionFeedbackProps) {
  const resolvedState = state ?? status ?? 'empty';

  if (resolvedState === 'refreshing') {
    return (
      <div className={cn('w-full min-w-0', className)}>
        <div
          role='status'
          aria-live='polite'
          aria-atomic='true'
          aria-busy='true'
          className='mb-3 rounded-md border border-borderMy bg-surface-muted px-3 py-2 text-sm text-clt-1'
        >
          {stateCopy.refreshing}
        </div>
        {children}
      </div>
    );
  }

  const isError = resolvedState === 'error';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic='true'
      className={cn(
        'flex w-full min-w-0 flex-col items-start gap-3 rounded-md border border-borderMy bg-surface px-4 py-5 text-clt-2',
        isError && 'border-danger/60',
        className
      )}
    >
      <p className='font-inter-medium text-base'>
        {message ?? stateCopy[resolvedState]}
      </p>
      {resolvedState === 'filtered-empty' || resolvedState === 'filter-empty' ? (
        <Button type='button' variant='outline' onClick={onClearFilter}>
          Limpar filtro
        </Button>
      ) : null}
      {isError && onRetry ? (
        <Button type='button' onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}

export default CollectionFeedback;
