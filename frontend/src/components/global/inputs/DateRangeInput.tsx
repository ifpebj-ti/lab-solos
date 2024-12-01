import { addDays, format } from 'date-fns';
import CalendarIcon from '../../../../public/icons/CalendarIcon';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useState } from 'react';

function DateRangeInput() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(2022, 0, 20),
    to: addDays(new Date(2022, 0, 20), 20),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id='date'
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal font-inter-regular text-clt-2 bg-backgroundMy rounded-sm border border-borderMy text-ellipsis text-nowrap overflow-hidden whitespace-nowrap',
            !date && 'text-muted-foreground'
          )}
        >
          <CalendarIcon fill='#474747' />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, 'dd/MM/yyyy')} -{' '}
                {format(date.to, 'dd/MM/yyyy')}
              </>
            ) : (
              format(date.from, 'dd/MM/yyyy')
            )
          ) : (
            <span>Pick a date</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0 bg-backgroundMy' align='start'>
        <Calendar
          initialFocus
          mode='range'
          defaultMonth={date?.from}
          selected={date}
          onSelect={setDate}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}

export default DateRangeInput;
