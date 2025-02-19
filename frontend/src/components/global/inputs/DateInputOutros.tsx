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
import { CreateOutrosFormData } from '../forms/create/FormOutros';

interface IDateInput {
  nome: string;
  name: Path<CreateOutrosFormData>; // Agora aceita apenas nomes válidos
  setValue: UseFormSetValue<CreateOutrosFormData>; // UseFormSetValue tipado corretamente
  error?: string;
  disabled?: boolean; // Adicionando a prop disabled
}

function DateInputOutros({
  nome,
  name,
  setValue,
  error,
  disabled = true,
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
      <p className='font-inter-regular text-sm text-clt-2 mt-3'>{nome}</p>
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'w-full justify-start text-left font-normal flex items-center px-4 gap-x-3 h-9 border border-borderMy rounded-sm text-clt-2 font-inter-regular text-sm',
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
      {error && <p className='text-red-500 text-xs'>{error}</p>}
    </div>
  );
}

export default DateInputOutros;
