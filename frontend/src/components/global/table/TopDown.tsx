import { useState } from 'react';
import TopDownIcon from '../../../../public/icons/TopDownIcon';

type TopDownProps = {
  onClick: () => void;
  top: boolean;
  isActive?: boolean; // Novo estado ativo opcional
};

function TopDown({ onClick, top, isActive = false }: TopDownProps) {
  const [active, setActive] = useState(isActive);

  const handleClick = () => {
    setActive(!active); // Alterna o estado ativo
    onClick(); // Chama a função onClick
  };
  return (
    <button
      onClick={handleClick}
      className={`border border-borderMy rounded-sm h-9 w-9 flex items-center justify-center hover:bg-cl-table-item transition-all ease-in-out duration-200 ${active ? 'bg-stone-300' : 'bg-backgroundMy'}`}
    >
      <span className={`${top ? 'rotate-0' : 'rotate-180'}`}>
        <TopDownIcon fill='#232323' />
      </span>
    </button>
  );
}

export default TopDown;
