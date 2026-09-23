import { type ReactNode } from 'react';
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

interface ITableItemWithActions {
  data: ReactNode[];
  rowIndex: number;
  destinationRoute: string;
  id: number | string;
  onRowClick?: () => void;
  itemLabel?: string;
}

const interactiveSelector =
  'a, button, input, select, textarea, [role="switch"], [role="checkbox"], [role="combobox"], [role="option"], [role="listbox"], [role="menuitem"]';

function TableItemWithActions({
  data,
  rowIndex,
  destinationRoute,
  id,
  onRowClick,
  itemLabel,
}: ITableItemWithActions) {
  const navigate = useNavigate();
  const columns = requireResponsiveColumns(useResponsiveColumns());
  const isOdd = rowIndex % 2 === 0;
  const backgroundColor = isOdd ? 'bg-surface' : 'bg-surface-muted';
  const recordDestination = onRowClick
    ? destinationRoute
    : getRecordDestination(destinationRoute, id);

  const openRecord = () => {
    if (onRowClick) onRowClick();
    else navigate(recordDestination, { state: { id } });
  };

  const handleRecordClick = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest(interactiveSelector)) return;
    openRecord();
  };

  if (columns.length !== data.length)
    throw new Error('Cada valor deve corresponder a uma coluna responsiva.');
  if (!itemLabel)
    throw new Error('A linha responsiva exige identificação do registro.');

  return (
      <ResponsiveRecord
        className={`${backgroundColor} cursor-pointer hover:bg-surface-selected [&_button]:min-h-11 [&_input]:min-h-11 [&_a]:min-h-11 [&_[role=combobox]]:min-h-11 [&_[role=combobox]]:max-w-full md:[&_button]:min-h-8 md:[&_input]:min-h-8 md:[&_a]:min-h-0 md:[&_[role=combobox]]:min-h-8 [@media(pointer:coarse)]:[&_button]:min-h-11 [@media(pointer:coarse)]:[&_input]:min-h-11 [@media(pointer:coarse)]:[&_a]:min-h-11 [@media(pointer:coarse)]:[&_[role=combobox]]:min-h-11`}
        onClick={handleRecordClick}
      >
        {data.map((value, index) => (
          <ResponsiveCell key={columns[index].key} columnKey={columns[index].key}>
            {index === 0 ? (
              onRowClick ? (
                <button
                  type='button'
                  aria-label={`Abrir ${itemLabel}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRowClick();
                  }}
                  className='inline-flex min-w-11 max-w-full break-all items-center rounded-md text-left underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:min-w-0'
                >
                  {value}
                </button>
              ) : (
                <Link
                  to={recordDestination}
                  state={{ id }}
                  aria-label={`Abrir ${itemLabel}`}
                  className='inline-flex min-w-11 max-w-full break-all items-center rounded-md underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:min-w-0'
                >
                  {value}
                </Link>
              )
            ) : (
              value
            )}
          </ResponsiveCell>
        ))}
      </ResponsiveRecord>
  );
}

export default TableItemWithActions;
