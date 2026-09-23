import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'; // Ajuste o caminho conforme necessário

import { useId } from 'react';
import { cn } from '@/lib/utils';

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
  value,
  onValueChange,
  error,
  required = false, // novo
}: SelectInputProps) => {
  const generatedId = useId();
  const inputId = `select-input-${generatedId}`;
  const errorId = `${inputId}-error`;

  return (
    <div className='flex w-full min-w-0 flex-col gap-y-1'>
      {label && (
        <label
          htmlFor={inputId}
          className='mt-3 font-inter-regular text-sm text-clt-2'
        >
          {label}
          {required && <span className='ml-1 text-danger'>*</span>}
        </label>
      )}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-required={required ? true : undefined}
          className={cn(
            'w-full font-inter-regular text-clt-2',
            error ? 'border-danger' : 'border-borderMy'
          )}
        >
          <SelectValue placeholder='Selecione' />
        </SelectTrigger>
        <SelectContent className='rounded-md border border-borderMy bg-surface font-inter-regular'>
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

export default SelectInput;
