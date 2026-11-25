import { useState, type Ref } from 'react';
import { CalendarIcon } from '@radix-ui/react-icons';
import { format, parseISO, setMonth, setYear, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CIVIL_DATE_INPUT_MASK,
  formatCivilDate,
  isAbsentCivilDate,
  parseCivilDateInput,
} from '@/function/date';
import { cn } from '@/lib/utils';

interface DateInputProps {
  nome: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  error?: string;
  required?: boolean;
  isDateDisabled?: (date: Date) => boolean;
}

const inputClasses =
  'min-h-11 min-w-0 rounded-md border border-borderMy bg-surface px-3 text-base text-clt-2 hover:border-focus focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:text-sm';
const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const firstCalendarDay = parseISO('0001-01-01');
const lastCalendarDay = parseISO('9999-12-31');

function DateInput({
  nome,
  name,
  value,
  onChange,
  onBlur,
  inputRef,
  error,
  required = false,
  isDateDisabled,
}: DateInputProps) {
  const [open, setOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [yearText, setYearText] = useState(() => String(calendarMonth.getFullYear()));
  const civilDate = parseCivilDateInput(value);
  const selectedDate = civilDate ? parseISO(civilDate) : undefined;
  const errorId = `${name}-error`;
  const calendarLabel = `Abrir calendário: ${nome}`;
  const isDayDisabled = (date: Date) =>
    isAbsentCivilDate(format(date, 'yyyy-MM-dd')) || (isDateDisabled?.(date) ?? false);

  const showMonth = (date: Date) => {
    setCalendarMonth(startOfMonth(date));
    setYearText(String(date.getFullYear()));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      showMonth(selectedDate ?? new Date());
    }
    setOpen(nextOpen);
  };

  const handleYearChange = (value: string) => {
    setYearText(value);
    const year = Number(value);
    if (/^\d{1,4}$/.test(value) && year >= 1 && year <= 9999) {
      setCalendarMonth(setYear(calendarMonth, year));
    }
  };

  const handleSelect = (date: Date) => {
    if (isDayDisabled(date)) {
      return;
    }

    onChange(formatCivilDate(format(date, 'yyyy-MM-dd')));
    setOpen(false);
  };

  return (
    <div className='flex w-full min-w-0 flex-col gap-y-1'>
      <label htmlFor={name} className='mt-3 font-inter-regular text-sm text-clt-2'>
        {nome}
        {required && <span aria-hidden='true' className='ml-1 text-danger'>*</span>}
      </label>
      <div className='flex gap-2'>
        <input
          ref={inputRef}
          id={name}
          name={name}
          type='text'
          placeholder={CIVIL_DATE_INPUT_MASK}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          onBlur={onBlur}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(inputClasses, 'w-full', error && 'border-danger')}
        />
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button
              type='button'
              aria-label={calendarLabel}
              className={cn(inputClasses, 'grid min-w-11 shrink-0 place-items-center')}
            >
              <CalendarIcon aria-hidden='true' className='size-4' />
            </button>
          </PopoverTrigger>
          <PopoverContent aria-label={calendarLabel} align='start' className='w-auto p-2'>
            <div className='flex gap-2 px-3 pt-2'>
              <label className='flex w-24 flex-col gap-1 text-sm'>
                Ano
                <input
                  className={inputClasses}
                  type='number'
                  min={1}
                  max={9999}
                  value={yearText}
                  onChange={(event) => handleYearChange(event.currentTarget.value)}
                  onBlur={() => setYearText(String(calendarMonth.getFullYear()))}
                />
              </label>
              <label className='flex min-w-0 flex-1 flex-col gap-1 text-sm'>
                Mês
                <select
                  className={inputClasses}
                  value={calendarMonth.getMonth()}
                  onChange={(event) => showMonth(setMonth(calendarMonth, Number(event.currentTarget.value)))}
                >
                  {months.map((month) => (
                    <option key={month} value={month}>
                      {ptBR.localize.month(month, { width: 'wide' })}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Calendar
              mode='single'
              required
              locale={ptBR}
              fromDate={firstCalendarDay}
              toDate={lastCalendarDay}
              disabled={isDayDisabled}
              month={calendarMonth}
              onMonthChange={showMonth}
              showOutsideDays={false}
              selected={selectedDate}
              onSelect={(day) => {
                if (day) {
                  handleSelect(day);
                }
              }}
              labels={{
                labelPrevious: () => 'Mês anterior',
                labelNext: () => 'Próximo mês',
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <p
        id={errorId}
        role={error ? 'alert' : undefined}
        className={cn('min-h-5 text-sm text-danger wrap-anywhere', !error && 'sr-only')}
      >
        {error ?? ''}
      </p>
    </div>
  );
}

export default DateInput;
