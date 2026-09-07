import SearchIcon from '../../../../public/icons/SearchIcon';

interface IInputSearch {
  name: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; // Define the event type here
  value: string;
}

function SearchInput({ name, onChange, value }: IInputSearch) {
  return (
    <div className='w-full min-w-0 flex border min-h-11 border-stone-500 rounded-sm bg-white focus-within:outline focus-within:outline-2 focus-within:outline-green-800 md:min-h-9 [@media(pointer:coarse)]:min-h-11'>
      <input
        type='text'
        name={name}
        aria-label='Pesquisar'
        className='w-full min-w-0 px-3 bg-white text-sm focus:outline-none'
        value={value} // Exibe o valor atual
        onChange={onChange} // Chama o manipulador quando o valor muda
      />
      <span
        aria-hidden='true'
        className='px-3 bg-backgroundMy flex items-center'
      >
        <SearchIcon fill='#232323' />
      </span>
    </div>
  );
}

export default SearchInput;
