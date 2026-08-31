import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const consumerPaths = [
  'src/pages/admin/AllLoans.tsx',
  'src/pages/admin/ClassLoan.tsx',
  'src/pages/admin/Home.tsx',
  'src/pages/admin/LoansRequest.tsx',
  'src/pages/admin/MentoringHistoryAdm.tsx',
  'src/pages/admin/ReturnLoan.tsx',
  'src/pages/loan/LoanHistories.tsx',
  'src/pages/loan/LoanHistory.tsx',
  'src/pages/mentee/HistoryMentoring.tsx',
  'src/pages/mentee/LoanHistory.tsx',
  'src/pages/mentor/HistoryClass.tsx',
  'src/pages/mentor/LoanCreation.tsx',
  'src/pages/mentor/MentoringHistory.tsx',
] as const;

describe('consumidores aninhados de usuario', () => {
  it.each(consumerPaths)('%s reutiliza o contrato compartilhado', (path) => {
    const source = readFileSync(resolve(process.cwd(), path), 'utf8');

    expect(source).toContain("@/contracts/user");
    expect(source).not.toMatch(/interface\s+IUsuario(?:II)?\b/);
    expect(source).not.toMatch(/dataIngresso:\s*string/);
    expect(source).not.toMatch(/formatDate(?:Time)?\([^\n]*dataIngresso/);
  });

  it('preserva formatadores de instante dos emprestimos e mentorias', () => {
    const sources = consumerPaths.map((path) =>
      readFileSync(resolve(process.cwd(), path), 'utf8')
    );

    expect(
      sources.some((source) => source.includes('formatDateTime(rowData.dataRealizacao)'))
    ).toBe(true);
  });
});
