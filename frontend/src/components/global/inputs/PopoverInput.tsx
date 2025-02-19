import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import { Check } from 'lucide-react';
import { useState } from 'react';
import UpDownIcon from '../../../../public/icons/UpDownIcon';
import { cn } from '@/lib/utils';

type PopoverInputProps = {
  unidades: { value: string | boolean; label: string }[]; // tipo das unidades que serão passadas via props
  value: string;
  onChange: (value: string) => void; // função para alterar o valor selecionado
  error?: string; // opcional: mensagem de erro
  title?: string;
};

const PopoverInput = ({
  unidades,
  value,
  onChange,
  error,
  title = 'Selecione a unidade de medida',
}: PopoverInputProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className='flex flex-col gap-y-1 w-full'>
      <p className='font-inter-regular text-sm text-clt-2 mt-3'>{title}</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            role='combobox'
            aria-expanded={open}
            className={`w-full justify-between flex h-9 rounded-sm items-center px-3 border font-inter-regular text-sm text-clt-2 ${error ? 'border-danger hover:border-red-700' : 'border-borderMy hover:border-gray-400'}`}
          >
            {value
              ? unidades.find((unidade) => unidade.value === value)?.label
              : 'Clique e selecione...'}
            <UpDownIcon />
          </button>
        </PopoverTrigger>
        <PopoverContent className='p-0'>
          <Command className='border border-borderMy bg-backgroundMy'>
            <CommandInput
              placeholder='Pesquisar'
              className='h-9 font-inter-regular'
            />
            <CommandList>
              <CommandEmpty>Nenhum medida correspondente</CommandEmpty>
              <CommandGroup>
                {unidades.map((unidade) => (
                  <CommandItem
                    key={unidade.value}
                    value={unidade.value}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? '' : currentValue); // altera o valor com base na seleção
                      setOpen(false);
                    }}
                  >
                    {unidade.label}
                    <Check
                      className={cn(
                        'ml-auto h-4 w-4',
                        value === unidade.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default PopoverInput;
