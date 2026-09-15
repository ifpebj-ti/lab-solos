import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  emprestimoSchema,
  emprestimosSchema,
  type Emprestimo,
} from './loan';
import { loanFixture } from '@/test/fixtures/loan';

describe('contrato de empréstimo', () => {
  it('aceita o DTO real com usuários e lote nullable', () => {
    const parsed = emprestimoSchema.parse(loanFixture);

    expect(parsed).toMatchObject({
      id: 42,
      produtos: [
        expect.objectContaining({
          emprestimoId: 42,
          produto: expect.objectContaining({ lote: expect.any(Object) }),
        }),
      ],
      aprovador: null,
      dataPrevistaDevolucao: '2026-09-15T10:00:00Z',
      dataDevolucao: null,
    });
  });

  it('aceita coleção vazia sem inventar item', () => {
    expect(emprestimosSchema.parse([])).toEqual([]);
  });

  it('rejeita o campo legado e tipos incompatíveis', () => {
    expect(
      emprestimoSchema.safeParse({
        ...loanFixture,
        produtos: undefined,
        emprestimoProdutos: [],
      }).success
    ).toBe(false);

    expect(
      emprestimoSchema.safeParse({ ...loanFixture, id: '42' }).success
    ).toBe(false);
  });

  it('expõe tipo derivado do mesmo schema', () => {
    expectTypeOf<Emprestimo['produtos'][number]['quantidade']>().toEqualTypeOf<number>();
  });
});
