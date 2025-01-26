import { useState } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@radix-ui/react-popover';
import { CalendarIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns'; // Para formatação de data
import { cn } from '../../../lib/utils'; // Função cn para juntar classes (se necessário)
import { Calendar } from '../../../components/ui/calendar';

function DateInput() {
  const [date, setDate] = useState<Date | undefined>(undefined); // Estado para armazenar a data selecionada

  return (
    <div className='flex flex-col gap-y-1 w-full'>
      <p className='font-inter-regular text-sm text-clt-2 mt-3'>
        Data de Validade
      </p>
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
              format(date, 'dd/MM/yyyy') // Formata a data selecionada
            ) : (
              <span>Selecione uma data</span> // Texto quando nenhuma data for selecionada
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <Calendar
            mode='single'
            selected={date} // Data selecionada
            onSelect={setDate} // Atualiza a data ao selecionar
            disabled={(date) => date < new Date()} // Desabilita datas passadas
            initialFocus
            className='border border-borderMy rounded-sm bg-backgroundMy'
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DateInput;
