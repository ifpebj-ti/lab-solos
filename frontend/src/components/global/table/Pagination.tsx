import DownIcon from '../../../../public/icons/DownIcon';

type PaginationProps = {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
};

function Pagination({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const maxButtons = 5;

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      onPageChange(pageNumber);
    }
  };

  const getPaginationRange = () => {
    let start = Math.max(currentPage - Math.floor(maxButtons / 2), 1);
    let end = start + maxButtons - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(end - maxButtons + 1, 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  return (
    <nav
      aria-label='Paginação'
      className='w-full min-w-0 flex flex-wrap gap-1 justify-center items-center mt-4'
    >
      <button
        type='button'
        aria-label='Primeira página'
        onClick={() => goToPage(1)}
        className='flex min-h-11 min-w-11 rotate-90 items-center justify-center rounded-md border border-borderMy bg-surface text-clt-2 hover:bg-surface-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:opacity-50 md:min-h-7 md:min-w-7 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11'
        disabled={currentPage === 1 || totalPages === 0}
      >
        <DownIcon />
      </button>
      {getPaginationRange().map((pageNumber) => (
        <button
          key={pageNumber}
          type='button'
          aria-label={`Página ${pageNumber}`}
          aria-current={currentPage === pageNumber ? 'page' : undefined}
          onClick={() => goToPage(pageNumber)}
          className={`min-h-11 min-w-11 rounded-md text-sm font-inter-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:min-h-7 md:min-w-7 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 ${
            currentPage === pageNumber
              ? 'bg-primaryMy text-[rgb(var(--color-action-foreground))]'
              : 'text-clt-2 hover:bg-surface-selected'
          }`}
        >
          {pageNumber}
        </button>
      ))}
      <button
        type='button'
        aria-label='Última página'
        onClick={() => goToPage(totalPages)}
        className='flex min-h-11 min-w-11 -rotate-90 items-center justify-center rounded-md border border-borderMy bg-surface text-clt-2 hover:bg-surface-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:opacity-50 md:min-h-7 md:min-w-7 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11'
        disabled={currentPage === totalPages || totalPages === 0}
      >
        <DownIcon />
      </button>
    </nav>
  );
}

export default Pagination;
