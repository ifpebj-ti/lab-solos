import { requireResponsiveColumns, useResponsiveColumns } from './responsiveContext';

function HeaderTable() {
  const responsiveColumns = requireResponsiveColumns(useResponsiveColumns());
  return (
    <div
      aria-hidden='true'
      className='hidden w-full min-w-0 grid-cols-[var(--responsive-columns)] gap-2 border-b border-borderMy px-3 pb-2 mb-1 mt-4 text-sm font-inter-regular text-clt-2 md:grid'
    >
      {responsiveColumns.map((column) => (
        <p className='min-w-0 [overflow-wrap:anywhere]' key={column.key}>
          {column.label}
        </p>
      ))}
    </div>
  );
}

export default HeaderTable;
