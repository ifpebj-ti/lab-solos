import { format } from 'date-fns';

export const formatDate = (isoDate?: string): string => {
  if (!isoDate) {
    return 'Data inválida'; // Ou retorne um valor padrão
  }
  const parsedDate = new Date(isoDate);
  if (isNaN(parsedDate.getTime())) {
    return 'Data inválida'; // Verifique se a data foi parseada corretamente
  }
  return format(parsedDate, 'dd/MM/yyyy');
};
