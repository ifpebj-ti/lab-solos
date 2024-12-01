import SearchIcon from '../../../../public/icons/SearchIcon';

interface IInputSearch {
  name: string;
}

function SearchInput({ name }: IInputSearch) {
  return (
    <div className='w-full flex border h-9 border-borderMy rounded-sm hover:border-gray-400 focus:border-gray-400 bg-slate-400'>
      <input
        type='text'
        name={name}
        className='w-full px-3 bg-backgroundMy h-full text-sm shadow-sm focus:outline-none'
      />
      <button type='button' className='px-4 bg-backgroundMy h-full shadow-sm'>
        <SearchIcon fill='#232323' />
      </button>
    </div>
  );
}

export default SearchInput;
