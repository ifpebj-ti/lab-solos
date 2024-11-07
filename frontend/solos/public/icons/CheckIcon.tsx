import React from 'react';
interface ICheckIcon {
  fill?: string;
}

export default function CheckIcon({ fill = '#474747' }: ICheckIcon) {
  return (
    <svg
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M20 6L9 17L4 12'
        stroke={fill}
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}
