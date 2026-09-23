import React from 'react';
import { Link } from 'react-router-dom';

interface IInfoCardProps {
  icon: React.ReactNode;
  text: string;
  notify: boolean;
  link: string;
  quant?: number;
}

function InfoCard({ icon, text, notify, link, quant }: IInfoCardProps) {
  const notificationLabel = quant === undefined
    ? 'Notificações pendentes'
    : `${quant} notificações pendentes`;

  return (
    <Link
      to={link}
      className='group flex min-h-20 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-borderMy bg-surface px-4 py-3 text-clt-2 shadow-sm transition-colors hover:bg-surface-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:w-[45%] lg:w-[30%] landscape:w-[40%]'
    >
      <div className='relative flex min-w-7 shrink-0 items-center justify-center text-cl-icon'>
        {icon}
        {notify && (
          <span
            role='status'
            aria-label={notificationLabel}
            className='absolute -left-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface bg-danger px-1 text-[rgb(var(--color-action-foreground))]'
          >
            <span className='font-rajdhani-bold text-xs'>{quant}</span>
          </span>
        )}
      </div>
      <p className='min-w-0 flex-1 break-words font-inter-medium text-xs uppercase leading-tight text-clt-2 landscape:px-0'>
        {text}
      </p>
    </Link>
  );
}

export default InfoCard;
