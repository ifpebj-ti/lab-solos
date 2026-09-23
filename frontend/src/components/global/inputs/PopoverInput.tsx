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
import { useId, useState } from 'react';
import UpDownIcon from '../../../../public/icons/UpDownIcon';
import { cn } from '@/lib/utils';

export type PopoverInputProps = {
  unidades: { value: string | boolean; label: string }[]; // tipo das unidades que serão passadas via props
  value: string;
  onChange: (value: string) => void; // função para alterar o valor selecionado
  error?: string; // opcional: mensagem de erro
  title?: string;
  id?: string;
  required?: boolean;
};

const PopoverInput = ({
  unidades,
  value,
  onChange,
  error,
  title = 'Selecione a unidade de medida',
  id,
  required = false,
}: PopoverInputProps) => {
  const [open, setOpen] = useState(false);
  const generatedId = useId();
  const inputId = id ?? `popover-input-${generatedId}`;
  const errorId = `${inputId}-error`;

  return (
    <div className='flex w-full min-w-0 flex-col gap-y-1'>
      <label
        htmlFor={inputId}
        className='mt-3 font-inter-regular text-sm text-clt-2'
      >
        {title}
        {required ? <span className='ml-1 text-danger'>*</span> : null}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={inputId}
            type='button'
            role='combobox'
            aria-expanded={open}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`flex min-h-11 w-full items-center justify-between rounded-md border px-3 font-inter-regular text-sm text-clt-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:min-h-9 ${error ? 'border-danger' : 'border-borderMy hover:border-focus'}`}
          >
            {value
              ? unidades.find(
                  (unidade) => String(unidade.value) === String(value)
                )?.label
              : 'Selecione...'}
            <span aria-hidden='true'>
              <UpDownIcon />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className='p-0'>
          <Command className='border border-borderMy bg-surface'>
            <CommandInput
              aria-label={`Pesquisar ${title}`}
              placeholder='Pesquisar'
              className='h-9 font-inter-regular'
            />
            <CommandList>
              <CommandEmpty>Nenhum medida correspondente</CommandEmpty>
              <CommandGroup>
                {unidades.map((unidade) => (
                  <CommandItem
                    key={String(unidade.value)}
                    value={String(unidade.value)}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? '' : currentValue);
                      setOpen(false);
                    }}
                  >
                    {unidade.label}
                    <Check
                      className={cn(
                        'ml-auto h-4 w-4',
                        value === String(unidade.value)
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p
        id={errorId}
        role={error ? 'alert' : undefined}
        className={cn(
          'min-h-5 text-sm text-danger [overflow-wrap:anywhere]',
          error ? '' : 'sr-only'
        )}
      >
        {error ?? ''}
      </p>
    </div>
  );
};

export default PopoverInput;
