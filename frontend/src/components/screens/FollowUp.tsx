import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type FollowUpCardProps = {
  title: string;
  number: string | number;
  icon: ReactNode;
  className?: string;
};

function FollowUpCard({ title, number, icon, className }: FollowUpCardProps) {
  return (
    <article
      className={cn(
        'flex min-h-24 w-full flex-col justify-between rounded-xl border border-borderMy bg-surface p-4 shadow-sm transition-colors hover:bg-surface-selected md:w-80',
        className
      )}
    >
      <div className='w-full flex items-center justify-between gap-x-2'>
        <p className='text-sm font-inter-regular text-clt-2'>{title}</p>
        <span className='h-full text-cl-icon2'>{icon}</span>
      </div>
      <div className='text-2xl font-inter-medium text-clt-2'>+{number}</div>
    </article>
  );
}

export default FollowUpCard;
