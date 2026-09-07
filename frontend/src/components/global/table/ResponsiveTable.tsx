import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import {
  TableContext,
  requireResponsiveColumns,
  useResponsiveColumns,
} from './responsiveContext';

export type ResponsiveColumn = { key: string; label: string; weight: number };
export type ResponsiveTableProps = {
  label: string;
  columns: readonly ResponsiveColumn[];
  children: ReactNode;
};
export type ResponsiveCellProps = { columnKey: string; children: ReactNode };

export function ResponsiveTable({
  label,
  columns,
  children,
}: ResponsiveTableProps) {
  if (
    !label.trim() ||
    columns.length === 0 ||
    new Set(columns.map((column) => column.key)).size !== columns.length ||
    columns.some(
      (column) =>
        !column.key.trim() ||
        !column.label.trim() ||
        !Number.isFinite(column.weight) ||
        column.weight <= 0
    )
  ) {
    throw new Error(
      'Informe descrição e colunas únicas, rotuladas e com peso positivo.'
    );
  }
  const style = {
    '--responsive-columns': columns
      .map((column) => `minmax(0, ${column.weight}fr)`)
      .join(' '),
  } as CSSProperties;
  return (
    <TableContext.Provider value={columns}>
      <div
        role='list'
        aria-label={label}
        style={style}
        className='w-full min-w-0'
      >
        {children}
      </div>
    </TableContext.Provider>
  );
}

export const ResponsiveRecord = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function ResponsiveRecord({ children, className = '', ...props }, ref) {
  requireResponsiveColumns(useResponsiveColumns());
  return (
    <div
      {...props}
      ref={ref}
      role='listitem'
      className={`w-full min-w-0 mb-3 rounded-sm px-3 py-3 md:mb-1 md:py-2 ${className}`}
    >
      <dl className='grid min-w-0 grid-cols-1 gap-3 md:grid-cols-[var(--responsive-columns)] md:gap-2'>
        {children}
      </dl>
    </div>
  );
});

export function ResponsiveCell({ columnKey, children }: ResponsiveCellProps) {
  const columns = requireResponsiveColumns(useResponsiveColumns());
  const column = columns.find((candidate) => candidate.key === columnKey);
  if (!column) throw new Error(`Coluna responsiva desconhecida: ${columnKey}`);
  return (
    <div className='min-w-0 text-sm text-clt-2 [overflow-wrap:anywhere]'>
      <dt className='font-inter-semibold mb-1 md:sr-only'>{column.label}</dt>
      <dd className='min-w-0 min-h-0 h-auto font-inter-regular'>{children}</dd>
    </div>
  );
}
