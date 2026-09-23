import { cn } from '@/lib/utils';

type InfoItem = {
  title: string;
  value: string | number | null;
  width: string;
};

type InfoContainerProps = {
  items: InfoItem[];
  className?: string;
  columns?: 1 | 2 | 3 | 4;
};

function InfoContainer({ items, className, columns }: InfoContainerProps) {
  const responsiveColumns = columns
    ? {
        1: 'grid-cols-1',
        2: 'sm:grid-cols-2',
        3: 'sm:grid-cols-2 lg:grid-cols-3',
        4: 'sm:grid-cols-2 lg:grid-cols-4',
      }[columns]
    : items.length >= 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : items.length === 3
        ? 'sm:grid-cols-3'
        : items.length === 2
          ? 'sm:grid-cols-2'
          : 'grid-cols-1';

  return (
    <div
      className={cn(
        'grid min-h-20 w-full min-w-0 items-start gap-x-6 gap-y-4 rounded-xl border border-borderMy bg-surface p-4 shadow-sm lg:w-[49%]',
        responsiveColumns,
        className
      )}
    >
      {items.map((item, index) => (
        <div key={`${item.title}-${index}`} className='min-w-0'>
          <p className='break-words font-inter-regular text-sm text-clt-1'>
            {item.title}
          </p>
          <p className='break-words font-inter-medium text-clt-2'>
            {item.value ?? '—'}
          </p>
        </div>
      ))}
    </div>
  );
}

export default InfoContainer;
