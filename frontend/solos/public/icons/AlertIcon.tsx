import React from 'react';
interface IAlertIcon {
  fill?: string;
  size?: number;
}

export default function AlertIcon({ fill = '#16A34A', size = 35 }: IAlertIcon) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 50 50'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M25 16.6667V25M25 33.3333H25.0208M41.6666 27.0833C41.6666 37.5 34.375 42.7083 25.7083 45.7292C25.2545 45.883 24.7615 45.8756 24.3125 45.7083C15.625 42.7083 8.33331 37.5 8.33331 27.0833V12.5C8.33331 11.9475 8.55281 11.4176 8.94351 11.0269C9.33421 10.6362 9.86411 10.4167 10.4166 10.4167C14.5833 10.4167 19.7916 7.91668 23.4166 4.75001C23.858 4.37292 24.4195 4.16574 25 4.16574C25.5805 4.16574 26.1419 4.37292 26.5833 4.75001C30.2291 7.93751 35.4166 10.4167 39.5833 10.4167C40.1358 10.4167 40.6658 10.6362 41.0565 11.0269C41.4472 11.4176 41.6666 11.9475 41.6666 12.5V27.0833Z'
        stroke={fill}
        strokeWidth='3'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}
