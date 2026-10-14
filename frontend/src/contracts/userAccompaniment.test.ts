import { describe, expect, it } from 'vitest';
import { usuarioAcompanhamentoSchema } from './user';

const minimumMentoringProfile = {
  id: 12,
  nomeCompleto: 'Ada Lovelace',
  email: 'ada@example.com',
  telefone: null,
  dataIngresso: '2024-02-29',
  instituicao: null,
  cidade: 'Belo Jardim',
  curso: 'ES',
  status: 'Habilitado',
  nivelUsuario: 'Mentorado',
} as const;

describe('contrato mínimo de acompanhamento', () => {
  it('aceita a projeção autorizada sem exigir campos do perfil completo', () => {
    expect(usuarioAcompanhamentoSchema.safeParse(minimumMentoringProfile)).toMatchObject({
      success: true,
      data: minimumMentoringProfile,
    });
  });
});
