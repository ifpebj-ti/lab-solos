import { describe, expect, it } from 'vitest';

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  getPasswordErrorMessage,
  passwordChangeSchema,
} from './passwordPolicy';

const parsePassword = (newPassword: string, confirmation = newPassword) =>
  passwordChangeSchema.safeParse({ newPassword, confirmation });

describe('passwordChangeSchema', () => {
  it.each([
    ['14 caracteres', 'a'.repeat(14), false],
    ['15 caracteres', 'a'.repeat(15), true],
    ['128 caracteres', 'a'.repeat(128), true],
    ['129 caracteres', 'a'.repeat(129), false],
  ])('valida o limite de %s', (_case, password, expectedSuccess) => {
    expect(parsePassword(password).success).toBe(expectedSuccess);
  });

  it('conta caracteres Unicode por ponto de código', () => {
    expect(parsePassword('🌱'.repeat(PASSWORD_MIN_LENGTH)).success).toBe(true);
    expect(parsePassword('🌱'.repeat(PASSWORD_MAX_LENGTH + 1)).success).toBe(
      false
    );
  });

  it('aceita senha sem regra artificial de composição', () => {
    expect(parsePassword('a'.repeat(PASSWORD_MIN_LENGTH)).success).toBe(true);
    expect(parsePassword(' '.repeat(PASSWORD_MIN_LENGTH)).success).toBe(true);
  });

  it('associa divergência de confirmação ao campo confirmation', () => {
    const result = parsePassword('senha-valida-com-15', 'senha-diferente-15');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmation).toContain(
        getPasswordErrorMessage('password_confirmation_mismatch')
      );
    }
  });
});

describe('getPasswordErrorMessage', () => {
  it('traduz o código de senha comum sem manter lista no cliente', () => {
    expect(getPasswordErrorMessage('password_common')).toBe(
      'Esta senha é muito comum. Escolha outra.'
    );
  });

  it('usa mensagem segura para código desconhecido sem ecoar valores', () => {
    const untrustedCode = 'segredo-enviado-pelo-servidor';
    const message = getPasswordErrorMessage(untrustedCode);

    expect(message).toBe('Não foi possível validar a senha. Tente novamente.');
    expect(message).not.toContain(untrustedCode);
  });
});
