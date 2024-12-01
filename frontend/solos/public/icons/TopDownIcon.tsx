interface ITopDownIcon {
  fill?: string;
}

export default function TopDownIcon({ fill = '#474747' }: ITopDownIcon) {
  return (
    <svg
      width='18'
      height='18'
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M8 6L12 2M12 2L16 6M12 2V22'
        stroke={fill}
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}
