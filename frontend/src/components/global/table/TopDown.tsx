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
      className='border border-stone-500 rounded-sm min-h-11 min-w-11 flex items-center justify-center hover:bg-cl-table-item focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-800 md:min-h-9 md:min-w-9 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11'
    >
      <span className={`${top ? 'rotate-0' : 'rotate-180'}`}>
        <TopDownIcon fill='#232323' />
      </span>
    </button>
  );
}

export default TopDown;
