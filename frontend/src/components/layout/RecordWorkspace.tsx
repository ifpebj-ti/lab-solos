import type { ReactNode } from 'react';
import { useId } from 'react';
import { ArrowLeft } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface RecordWorkspaceProps {
  list: ReactNode;
  detail: ReactNode;
  selectedId?: string | number | null;
  selectedLabel?: ReactNode;
  onBack: () => void;
  listLabel?: string;
  detailLabel?: string;
  className?: string;
}

function RecordWorkspace({
  list,
  detail,
  selectedId,
  selectedLabel,
  onBack,
  listLabel = 'Lista de registros',
  detailLabel = 'Detalhe do registro',
  className,
}: RecordWorkspaceProps) {
  const workspaceId = useId();
  const listHeadingId = `${workspaceId}-list`;
  const detailHeadingId = `${workspaceId}-detail`;
  const hasSelection = selectedId !== undefined && selectedId !== null;

  return (
    <div
      className={cn(
        'grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.6fr)] md:gap-6',
        className
      )}
      data-record-workspace='true'
    >
      <section
        aria-labelledby={listHeadingId}
        className={cn('min-w-0', hasSelection && 'hidden md:block')}
      >
        <h2
          id={listHeadingId}
          className='mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-clt-1'
        >
          {listLabel}
        </h2>
        {list}
      </section>

      <section
        aria-labelledby={detailHeadingId}
        className={cn('min-w-0', !hasSelection && 'hidden md:block')}
      >
        <div className='mb-3 flex min-w-0 flex-wrap items-center gap-3'>
          <button
            type='button'
            onClick={onBack}
            aria-label='Voltar para a lista'
            title='Voltar para a lista'
            className='inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-borderMy text-clt-2 transition-colors hover:bg-surface-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:hidden'
          >
            <ArrowLeft aria-hidden='true' className='h-5 w-5' />
          </button>
          <h2
            id={detailHeadingId}
            className='min-w-0 text-sm font-semibold uppercase tracking-[0.08em] text-clt-1'
          >
            {detailLabel}
          </h2>
        </div>
        {hasSelection && selectedLabel ? (
          <p className='mb-3 text-sm text-clt-1 [overflow-wrap:anywhere]'>
            Registro selecionado: {selectedLabel}
          </p>
        ) : null}
        {detail}
      </section>
    </div>
  );
}

export default RecordWorkspace;
