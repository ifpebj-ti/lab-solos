interface ISearchIcon {
  fill?: string;
}

export default function SearchIcon({ fill = '#fff' }: ISearchIcon) {
  return (
    <svg
      width='15'
      height='15'
      viewBox='0 0 20 20'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M19 19L14.7 14.7M17 9C17 13.4183 13.4183 17 9 17C4.58172 17 1 13.4183 1 9C1 4.58172 4.58172 1 9 1C13.4183 1 17 4.58172 17 9Z'
        stroke={fill}
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}
