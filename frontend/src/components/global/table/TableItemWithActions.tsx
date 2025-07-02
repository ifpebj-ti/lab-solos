import { useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';

interface ITableItemWithActions {
  data: (string | ReactNode)[]; // Array de valores/componentes para cada coluna da linha
  rowIndex: number;
  columnWidths: string[]; // Array com as larguras de cada coluna
  destinationRoute: string; // Rota de destino
  id: number | string; // ID do item para navegação
  onRowClick?: () => void; // Callback opcional para clique personalizado
}

function TableItemWithActions({
  data,
  rowIndex,
  columnWidths,
  destinationRoute,
  id,
  onRowClick,
}: ITableItemWithActions) {
  const navigate = useNavigate();
  const isOdd = rowIndex % 2 === 0;
  const backgroundColor = isOdd ? 'bg-backgroundMy' : 'bg-cl-table-item';

  const handleClick = (e: React.MouseEvent) => {
    // Não navegar se o clique foi em um elemento interativo (select, button, etc.)
    const target = e.target as HTMLElement;
    if (target.closest('button, select, [role="combobox"], [role="button"]')) {
      return;
    }

    if (onRowClick) {
      onRowClick();
    } else {
      navigate(destinationRoute, { state: { id } });
    }
  };

  return (
    <div
      className={`w-full h-9 flex items-center ${backgroundColor} mb-1 px-3 rounded-sm hover:scale-customScale cursor-pointer ${isOdd ? 'hover:bg-cl-table' : 'hover:bg-opacity-60'}`}
      onClick={handleClick}
    >
      {data.map((value, index) => (
        <div
          key={index}
          style={{ width: columnWidths[index] }}
          className='flex items-center text-start font-inter-regular text-sm text-clt-2'
        >
          {typeof value === 'string' ? (
            <span className='text-ellipsis text-nowrap overflow-hidden whitespace-nowrap'>
              {value}
            </span>
          ) : (
            value
          )}
        </div>
      ))}
    </div>
  );
}

export default TableItemWithActions;
