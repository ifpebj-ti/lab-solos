import React from 'react';
interface IUpDownIcon {
  fill?: string;
}

export default function UpDownIcon({ fill = '#474747' }: IUpDownIcon) {
  return (
    <svg
      width='15'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M7 15L12 20L17 15M7 9L12 4L17 9'
        stroke={fill}
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}
