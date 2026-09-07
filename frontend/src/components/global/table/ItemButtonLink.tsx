import { type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ResponsiveCell, ResponsiveRecord } from './ResponsiveTable';
import { requireResponsiveColumns, useResponsiveColumns } from './responsiveContext';

type ItemButtonLinkProps = {
  data: string[];
  rowIndex: number;
  onClick1: () => void;
  onClick2?: () => void;
  icon1: ReactNode;
  icon2: ReactNode;
  destinationRoute: string;
  id: number | string;
  itemLabel?: string;
  actionLabels?: readonly [string, string?];
};

function ItemButtonLink({
  data,
  rowIndex,
  onClick1,
  onClick2,
  icon1,
  icon2,
  destinationRoute,
  id,
  itemLabel,
  actionLabels,
}: ItemButtonLinkProps) {
  const navigate = useNavigate();
  const columns = requireResponsiveColumns(useResponsiveColumns());
  const isOdd = rowIndex % 2 === 0;
  const backgroundColor = isOdd ? 'bg-backgroundMy' : 'bg-cl-table-item';

  const navigateToRecord = () => {
    navigate(destinationRoute, { state: { id } });
  };

  const actions = (
    <div className='flex min-w-0 flex-wrap items-center gap-3'>
      <button
        type='button'
        aria-label={
          itemLabel && actionLabels ? `${actionLabels[0]} ${itemLabel}` : undefined
        }
        onClick={(event) => {
          event.stopPropagation();
          onClick1();
        }}
        className='flex min-h-11 min-w-11 items-center justify-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-800 md:min-h-7 md:min-w-7 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11'
      >
        <span aria-hidden='true'>{icon1}</span>
      </button>
      <button
        type='button'
        aria-label={
          itemLabel && actionLabels?.[1]
            ? `${actionLabels[1]} ${itemLabel}`
            : undefined
        }
        onClick={(event) => {
          event.stopPropagation();
          onClick2?.();
        }}
        className='flex min-h-11 min-w-11 items-center justify-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-800 md:min-h-7 md:min-w-7 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11'
      >
        <span aria-hidden='true'>{icon2}</span>
      </button>
    </div>
  );

  if (columns.length !== data.length + 1)
    throw new Error(
      'Cada valor e a celula de acoes devem corresponder as colunas responsivas.'
    );
  if (!itemLabel || !actionLabels?.[0] || !actionLabels[1])
    throw new Error('Acoes responsivas exigem nomes e identificacao do registro.');
  return (
      <ResponsiveRecord
        className={`${backgroundColor} cursor-pointer hover:bg-cl-table`}
        onClick={(event) => {
          if (
            (event.target as HTMLElement).closest(
              'a, button, input, select, textarea, [role="switch"], [role="checkbox"], [role="combobox"]'
            )
          )
            return;
          navigateToRecord();
        }}
      >
        {data.map((value, index) => (
          <ResponsiveCell key={columns[index].key} columnKey={columns[index].key}>
            {index === 0 ? (
              <Link
                to={destinationRoute}
                state={{ id }}
                className='inline-flex min-h-11 min-w-11 max-w-full items-center rounded-sm underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-800 md:min-h-0 [@media(pointer:coarse)]:min-h-11'
              >
                {value}
              </Link>
            ) : (
              value
            )}
          </ResponsiveCell>
        ))}
        <ResponsiveCell columnKey={columns[data.length].key}>
          {actions}
        </ResponsiveCell>
      </ResponsiveRecord>
  );
}

export default ItemButtonLink;
