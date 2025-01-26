interface ILoanIcon {
  fill?: string;
}

export default function LoanIcon({ fill = '#16A34A' }: ILoanIcon) {
  return (
    <svg
      width='35'
      height='35'
      viewBox='0 0 50 50'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M27.9167 4.16666H12.5C11.3949 4.16666 10.3351 4.60565 9.55372 5.38705C8.77232 6.16845 8.33333 7.22826 8.33333 8.33333V41.6667C8.33333 42.7717 8.77232 43.8315 9.55372 44.6129C10.3351 45.3943 11.3949 45.8333 12.5 45.8333H37.5C38.6051 45.8333 39.6649 45.3943 40.4463 44.6129C41.2277 43.8315 41.6667 42.7717 41.6667 41.6667V26.25M4.16667 12.5H12.5M4.16667 20.8333H12.5M4.16667 29.1667H12.5M4.16667 37.5H12.5M44.5375 11.7208C45.3674 10.8909 45.8336 9.76533 45.8336 8.59166C45.8336 7.418 45.3674 6.2924 44.5375 5.46249C43.7076 4.63259 42.582 4.16635 41.4083 4.16635C40.2347 4.16635 39.1091 4.63259 38.2792 5.46249L27.8417 15.9042C27.3463 16.3992 26.9838 17.0111 26.7875 17.6833L25.0437 23.6625C24.9915 23.8418 24.9883 24.0318 25.0347 24.2127C25.081 24.3936 25.1751 24.5587 25.3072 24.6907C25.4392 24.8228 25.6043 24.9169 25.7852 24.9632C25.9661 25.0096 26.1561 25.0064 26.3354 24.9542L32.3146 23.2104C32.9868 23.0141 33.5987 22.6516 34.0937 22.1562L44.5375 11.7208Z'
        stroke={fill}
        strokeWidth='3'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}
