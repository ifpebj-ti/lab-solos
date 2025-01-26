interface IProfileIcon {
  fill?: string;
}

export default function ProfileIcon({ fill = '#fff' }: IProfileIcon) {
  return (
    <svg
      width='22'
      height='22'
      viewBox='0 0 34 34'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M27 32C27 29.3478 25.9464 26.8043 24.0711 24.9289C22.1957 23.0536 19.6522 22 17 22M17 22C14.3478 22 11.8043 23.0536 9.92893 24.9289C8.05357 26.8043 7 29.3478 7 32M17 22C20.6819 22 23.6667 19.0152 23.6667 15.3333C23.6667 11.6514 20.6819 8.66667 17 8.66667C13.3181 8.66667 10.3333 11.6514 10.3333 15.3333C10.3333 19.0152 13.3181 22 17 22ZM5.33333 2H28.6667C30.5076 2 32 3.49238 32 5.33333V28.6667C32 30.5076 30.5076 32 28.6667 32H5.33333C3.49238 32 2 30.5076 2 28.6667V5.33333C2 3.49238 3.49238 2 5.33333 2Z'
        stroke={fill}
        strokeWidth='3'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}
