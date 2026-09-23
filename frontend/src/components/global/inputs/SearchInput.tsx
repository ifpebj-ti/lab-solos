import SearchIcon from '../../../../public/icons/SearchIcon';

interface IInputSearch {
  name: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; // Define the event type here
  value: string;
}

function SearchInput({ name, onChange, value }: IInputSearch) {
  return (
    <div className='flex min-h-11 w-full min-w-0 rounded-md border border-borderMy bg-surface focus-within:outline-none focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-2 focus-within:ring-offset-canvas md:min-h-9 [@media(pointer:coarse)]:min-h-11'>
      <input
        type='text'
        name={name}
        aria-label='Pesquisar'
        className='w-full min-w-0 bg-transparent px-3 text-sm text-clt-2 placeholder:text-clt-1 focus:outline-none'
        value={value} // Exibe o valor atual
        onChange={onChange} // Chama o manipulador quando o valor muda
      />
      <span
        aria-hidden='true'
        className='flex items-center bg-backgroundMy px-3 text-clt-2'
      >
        <SearchIcon fill='currentColor' />
      </span>
    </div>
  );
}

export default SearchInput;
