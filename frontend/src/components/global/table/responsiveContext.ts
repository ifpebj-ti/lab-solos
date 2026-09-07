import { createContext, useContext } from 'react';
import type { ResponsiveColumn } from './ResponsiveTable';

export const TableContext = createContext<readonly ResponsiveColumn[] | null>(
  null
);

// Null is reserved for explicitly supported, not-yet-migrated adapters.
export function useResponsiveColumns() {
  return useContext(TableContext);
}

export function requireResponsiveColumns(
  columns: readonly ResponsiveColumn[] | null
) {
  if (!columns)
    throw new Error(
      'A estrutura responsiva exige ResponsiveTable e colunas rotuladas.'
    );
  return columns;
}
