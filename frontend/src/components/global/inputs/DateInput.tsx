import { useState } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@radix-ui/react-popover';
import { CalendarIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { cn } from '../../../lib/utils';
import { Calendar } from '../../../components/ui/calendar';
import { UseFormSetValue, Path } from 'react-hook-form';
import { CreateQuimicoFormData } from '../forms/create/FormQuimicos';

interface IDateInput {
  nome: string;
  name: Path<CreateQuimicoFormData>; // Agora aceita apenas nomes válidos
  setValue: UseFormSetValue<CreateQuimicoFormData>; // UseFormSetValue tipado corretamente
  error?: string;
  disabled?: boolean; // Adicionando a prop disabled
  required?: boolean; // novo
}

function DateInput({
  nome,
  name,
  setValue,
  error,
  disabled = true,
  required = false, // novo
}: IDateInput) {
  const [date, setDate] = useState<Date | undefined>(undefined);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      setValue(name, format(selectedDate, 'yyyy-MM-dd')); // Formato compatível com o Zod
    }
  };

  return (
    <div className='flex flex-col gap-y-1 w-full'>
      <label
        htmlFor={String(name)}
        className='mt-3 font-inter-regular text-sm text-clt-2'
      >
        {nome}
        {required && <span className='ml-1 text-danger'>*</span>}
      </label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            id={String(name)}
            type='button'
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${String(name)}-error` : undefined}
            className={cn(
              'flex min-h-11 w-full items-center justify-start gap-x-3 rounded-md border border-borderMy px-4 text-left font-inter-regular text-sm font-normal text-clt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:min-h-9',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className='w-4 text-[#2e2e2e]' />
            {date ? (
              format(date, 'dd/MM/yyyy')
            ) : (
              <span>Selecione uma data</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <Calendar
            mode='single'
            selected={date}
            onSelect={handleDateSelect}
            disabled={(date) => disabled && date < new Date()} // Bloqueia apenas datas passadas quando disablePastDates=true
            initialFocus
            className='border border-borderMy rounded-sm bg-backgroundMy'
          />
        </PopoverContent>
      </Popover>
      <p
        id={`${String(name)}-error`}
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
}

export default DateInput;
