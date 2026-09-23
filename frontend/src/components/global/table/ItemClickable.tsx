import { Link, useNavigate } from 'react-router-dom';
import { buildDetailUrl, normalizePathname } from '@/navigation/profileNavigation';
import { ResponsiveCell, ResponsiveRecord } from './ResponsiveTable';
import { requireResponsiveColumns, useResponsiveColumns } from './responsiveContext';

const DETAIL_ROUTES = new Set([
  '/admin/history/loan',
  '/mentor/history/loan',
  '/mentee/history/loan',
  '/admin/history/mentoring',
  '/mentor/history/mentoring',
  '/admin/view-class',
  '/admin/view-class-mentor',
  '/admin/view-history-class-by-id',
  '/admin/return',
  '/admin/verification',
  '/mentor/verification',
  '/mentee/verification',
]);

const getRecordDestination = (destinationRoute: string, id: number | string) => {
  try {
    if (DETAIL_ROUTES.has(normalizePathname(destinationRoute))) {
      return buildDetailUrl(destinationRoute, id);
    }
  } catch {
    return destinationRoute;
  }

  return destinationRoute;
};

interface ITableItem {
  data: string[]; // Array de valores para cada coluna da linha
  rowIndex: number;
  destinationRoute: string; // Rota de destino
  id: number | string; // ID do item para navegação
}

function ClickableItemTable({
  data,
  rowIndex,
  destinationRoute,
  id,
}: ITableItem) {
  const navigate = useNavigate();
  const columns = requireResponsiveColumns(useResponsiveColumns());
  const isOdd = rowIndex % 2 === 0;
  const backgroundColor = isOdd ? 'bg-surface' : 'bg-surface-muted';
  const recordDestination = getRecordDestination(destinationRoute, id);

  const handleClick = () => {
    navigate(recordDestination, { state: { id } });
  };
  if (columns.length !== data.length)
    throw new Error('Cada valor deve corresponder a uma coluna responsiva.');
  return (
      <ResponsiveRecord
        className={`${backgroundColor} hover:bg-surface-selected cursor-pointer`}
        onClick={(event) => {
          if (
            (event.target as HTMLElement).closest(
              'a, button, input, select, textarea, [role="switch"], [role="checkbox"], [role="combobox"]'
            )
          )
            return;
          handleClick();
        }}
      >
        {data.map((value, index) => (
          <ResponsiveCell
            key={columns[index].key}
            columnKey={columns[index].key}
          >
            {index === 0 ? (
              <Link
                to={recordDestination}
                state={{ id }}
        className='inline-flex min-h-11 min-w-11 max-w-full items-center rounded-md underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:min-h-0 [@media(pointer:coarse)]:min-h-11'
              >
                {value}
              </Link>
            ) : (
              value
            )}
          </ResponsiveCell>
        ))}
      </ResponsiveRecord>
  );
}

export default ClickableItemTable;
