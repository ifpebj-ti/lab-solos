import TopDownIcon from '../../../../public/icons/TopDownIcon';

type TopDownProps = {
  onClick: () => void;
  top: boolean;
};

function TopDown({ onClick, top }: TopDownProps) {
  const handleClick = () => {
    onClick(); // Chama a função onClick
  };
  return (
    <button
      type='button'
      aria-label='Inverter ordem'
      aria-pressed={!top}
      onClick={handleClick}
      className='flex min-h-11 min-w-11 items-center justify-center rounded-md border border-borderMy bg-surface text-clt-2 hover:bg-surface-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:min-h-9 md:min-w-9 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11'
    >
      <span className={`${top ? 'rotate-0' : 'rotate-180'}`}>
        <TopDownIcon fill='currentColor' />
      </span>
    </button>
  );
}

export default TopDown;
