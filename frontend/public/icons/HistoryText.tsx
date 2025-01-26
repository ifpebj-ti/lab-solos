import React from 'react';

interface IHistoryText {
  fill?: string;
  tam?: string;
}

export default function HistoryText({
  fill = '#fff',
  tam = '24',
}: IHistoryText) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={tam}
      height={tam}
      viewBox='0 0 24 24'
      fill='none'
      stroke={fill}
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='lucide lucide-scroll-text'
    >
      <path d='M15 12h-5' />
      <path d='M15 8h-5' />
      <path d='M19 17V5a2 2 0 0 0-2-2H4' />
      <path d='M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3' />
    </svg>
  );
}
