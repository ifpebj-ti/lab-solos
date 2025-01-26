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
      onClick={handleClick}
      className={`border border-borderMy rounded-sm h-9 w-9 flex items-center justify-center hover:bg-cl-table-item transition-all ease-in-out duration-200`}
    >
      <span className={`${top ? 'rotate-0' : 'rotate-180'}`}>
        <TopDownIcon fill='#232323' />
      </span>
    </button>
  );
}

export default TopDown;
