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
    <div className='flex justify-center items-center mt-4'>
      <button
        onClick={() => goToPage(1)}
        className='w-7 h-7 border rounded hover:bg-stone-300 rotate-90 flex items-center justify-center'
        disabled={currentPage === 1}
      >
        <DownIcon />
      </button>
      {getPaginationRange().map((pageNumber) => (
        <button
          key={pageNumber}
          onClick={() => goToPage(pageNumber)}
          className={`w-7 h-7 rounded text-xs font-inter-medium mx-1 ${
            currentPage === pageNumber
              ? 'bg-primaryMy text-white'
              : 'hover:bg-cl-table-item'
          }`}
        >
          {pageNumber}
        </button>
      ))}
      <button
        onClick={() => goToPage(totalPages)}
        className='w-7 h-7 border hover:bg-stone-300 rounded -rotate-90 flex items-center justify-center'
        disabled={currentPage === totalPages}
      >
        <DownIcon />
      </button>
    </div>
  );
}

export default Pagination;
