import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  academicoSchema,
  dependenteSchema,
  responsavelSchema,
  usuarioSchema,
  type Academico,
  type Usuario,
} from './user';

const commonUser = {
  id: 1,
  nomeCompleto: 'Ada Lovelace',
  email: 'ada@example.com',
  telefone: null,
  dataIngresso: '2024-02-29',
  status: 'Habilitado',
  nivelUsuario: 'Mentor',
} as const;

describe('contrato compartilhado de usuario', () => {
  it('aceita data civil valida ou nula nos schemas de usuario', () => {
    expect(
      usuarioSchema.parse({
        ...commonUser,
        tipoUsuario: 'Academico',
        responsavel: null,
      }).dataIngresso
    ).toBe('2024-02-29');

    expect(
      usuarioSchema.parse({
        ...commonUser,
        dataIngresso: null,
        tipoUsuario: 'Academico',
        responsavel: null,
      }).dataIngresso
    ).toBeNull();
  });

  it.each([
    '2024-02-30',
    '2023-02-29',
    '2024-2-09',
    '2024-02-29T00:00:00Z',
    'texto-livre',
  ])('rejeita data de ingresso fora do contrato: %s', (dataIngresso) => {
    const result = usuarioSchema.safeParse({
      ...commonUser,
      dataIngresso,
      tipoUsuario: 'Academico',
      responsavel: null,
    });

    expect(result.success).toBe(false);
  });

  it('rejeita tipos divergentes e enums que nao pertencem a API', () => {
    expect(
      usuarioSchema.safeParse({
        ...commonUser,
        id: '1',
        tipoUsuario: 'Academico',
        responsavel: null,
      }).success
    ).toBe(false);
    expect(
      usuarioSchema.safeParse({
        ...commonUser,
        status: 1,
        tipoUsuario: 'Academico',
        responsavel: null,
      }).success
    ).toBe(false);
    expect(
      usuarioSchema.safeParse({
        ...commonUser,
        nivelUsuario: 'Professor',
        tipoUsuario: 'Academico',
        responsavel: null,
      }).success
    ).toBe(false);
  });

  it('representa academico, responsavel e dependente com campos anulaveis', () => {
    const academic = academicoSchema.parse({
      ...commonUser,
      tipoUsuario: 'Academico',
      responsavel: null,
      instituicao: 'IFPE',
      cidade: null,
      curso: null,
    });
    const responsible = responsavelSchema.parse({
      ...commonUser,
      dataIngresso: null,
      instituicao: null,
      cidade: null,
      curso: null,
    });
    const dependent = dependenteSchema.parse({
      ...commonUser,
      telefone: null,
      instituicao: 'IFPE',
      cidade: 'Belo Jardim',
      curso: 'ES',
    });

    expect(academic.cidade).toBeNull();
    expect(responsible.dataIngresso).toBeNull();
    expect(dependent.telefone).toBeNull();
  });

  it('infere nulabilidade no contrato TypeScript', () => {
    expectTypeOf<Usuario['telefone']>().toEqualTypeOf<string | null>();
    expectTypeOf<Usuario['dataIngresso']>().toEqualTypeOf<string | null>();
    expectTypeOf<Academico['cidade']>().toEqualTypeOf<string | null>();
    expectTypeOf<Academico['curso']>().toEqualTypeOf<string | null>();
  });
});
