import { useNavigate } from 'react-router-dom';

interface ITableItem {
  data: string[]; // Array de valores para cada coluna da linha
  rowIndex: number;
  columnWidths: string[]; // Array com as larguras de cada coluna
  destinationRoute: string; // Rota de destino
  id: number | string; // ID do item para navegação
}

function ClickableItemTable({
  data,
  rowIndex,
  columnWidths,
  destinationRoute,
  id,
}: ITableItem) {
  const navigate = useNavigate();
  const isOdd = rowIndex % 2 === 0;
  const backgroundColor = isOdd ? 'bg-backgroundMy' : 'bg-cl-table-item';

  const handleClick = () => {
    navigate(destinationRoute, { state: { id } });
  };
  return (
    <div
      className={`w-full h-9 flex items-center ${backgroundColor} mb-1 px-3 rounded-sm hover:scale-customScale cursor-pointer ${isOdd ? 'hover:bg-cl-table' : 'hover:bg-opacity-60'}`}
      onClick={handleClick}
    >
      {data.map((value, index) => (
        <p
          key={index}
          style={{ width: columnWidths[index] }}
          className='text-start font-inter-regular text-sm text-clt-2 text-ellipsis text-nowrap overflow-hidden whitespace-nowrap'
        >
          {value}
        </p>
      ))}
    </div>
  );
}

export default ClickableItemTable;
