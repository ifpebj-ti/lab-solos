import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'; // Ajuste o caminho conforme necessário

type SelectInputProps = {
  label?: string;
  options: { value: string; label: string }[]; // Lista de opções para o Select
  value: string;
  onValueChange: (value: string) => void; // Função para alterar o valor
  error?: string; // Mensagem de erro, se houver
  required?: boolean; // novo
};

const SelectInput = ({
  label,
  options,
  onValueChange,
  error,
  required = false, // novo
}: SelectInputProps) => {
  return (
    <div className='flex flex-col gap-y-1 w-full min-w-40'>
      {label && (
        <p className='font-inter-regular text-sm text-clt-2 mt-3'>
          {label}
          {required && <span className='text-red-500 ml-1'>*</span>}
        </p>
      )}
      <Select onValueChange={onValueChange}>
        <SelectTrigger
          className={`w-full border rounded-sm text-clt-2 font-inter-regular ${error ? 'border-danger hover:border-red-700' : 'border-borderMy hover:border-gray-400'}`}
        >
          <SelectValue placeholder='Selecione' />
        </SelectTrigger>
        <SelectContent className='border border-borderMy rounded-md font-inter-regular bg-white'>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              className='hover:bg-cl-table-item font-inter-regular'
              value={option.value}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SelectInput;
