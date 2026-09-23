import { requireResponsiveColumns, useResponsiveColumns } from './responsiveContext';

function HeaderTable() {
  const responsiveColumns = requireResponsiveColumns(useResponsiveColumns());
  return (
    <div
      aria-hidden='true'
      className='mt-4 mb-1 hidden w-full min-w-0 grid-cols-[var(--responsive-columns)] gap-2 border-b border-borderMy px-3 pb-2 text-sm font-inter-semibold text-clt-1 md:grid'
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
