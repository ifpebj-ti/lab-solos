import { format, parseISO, isValid } from 'date-fns';

const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const NOT_INFORMED = 'Não informado';

const isLeapYear = (year: number): boolean =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const daysInMonth = (year: number, month: number): number => {
  const monthLengths = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return monthLengths[month - 1] ?? 0;
};

export const isCivilDate = (value: string): boolean => {
  const match = CIVIL_DATE_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const [, yearPart, monthPart, dayPart] = match;
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
};

export const formatCivilDate = (
  civilDate?: string | null
): string => {
  if (!civilDate || !isCivilDate(civilDate)) {
    return NOT_INFORMED;
  }

  const [year, month, day] = civilDate.split('-');
  return `${day}/${month}/${year}`;
};

export const displayUserValue = (value?: string | null): string => {
  if (value == null) {
    return NOT_INFORMED;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue || normalizedValue.toLowerCase() === 'indefinido') {
    return NOT_INFORMED;
  }

  return value;
};

export const formatDate = (isoDate?: string): string => {
  if (!isoDate) {
    return 'Data inválida';
  }

  const parsedDate = parseISO(isoDate);

  if (!isValid(parsedDate)) {
    return 'Data inválida';
  }

  return format(parsedDate, 'dd/MM/yyyy');
};

export const formatDateTime = (isoDate?: string): string => {
  if (!isoDate) {
    return 'Data inválida'; // Ou retorne um valor padrão
  }
  const parsedDate = new Date(isoDate);
  if (isNaN(parsedDate.getTime())) {
    return 'Data inválida'; // Verifique se a data foi parseada corretamente
  }
  return format(parsedDate, 'dd/MM/yyyy HH:mm');
};
