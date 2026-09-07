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
        className='min-w-11 min-h-11 border border-stone-500 rounded hover:bg-stone-300 rotate-90 flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-800 disabled:opacity-50 md:min-w-7 md:min-h-7 [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:min-h-11'
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
          className={`min-w-11 min-h-11 rounded text-sm font-inter-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-800 md:min-w-7 md:min-h-7 [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:min-h-11 ${
            currentPage === pageNumber
              ? 'bg-green-800 text-white'
              : 'hover:bg-cl-table-item'
          }`}
        >
          {pageNumber}
        </button>
      ))}
      <button
        type='button'
        aria-label='Última página'
        onClick={() => goToPage(totalPages)}
        className='min-w-11 min-h-11 border border-stone-500 hover:bg-stone-300 rounded -rotate-90 flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-800 disabled:opacity-50 md:min-w-7 md:min-h-7 [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:min-h-11'
        disabled={currentPage === totalPages || totalPages === 0}
      >
        <DownIcon />
      </button>
    </nav>
  );
}

export default Pagination;
