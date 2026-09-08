import { describe, expect, it } from 'vitest';

import {
  ERROR_CATALOG,
  EXPECTED_ERROR_FIELDS,
  KNOWN_ERROR_CODES,
  OPERATION_IDS,
  getFieldErrorMessage,
  getOperationLabel,
} from './errorCatalog';

describe('errorCatalog', () => {
  it('mantém mensagem local e retryable para cada categoria', () => {
    expect(Object.keys(ERROR_CATALOG)).toEqual([
      'validation',
      'authentication',
      'authorization',
      'not_found',
      'conflict',
      'network',
      'timeout',
      'server',
      'unknown',
    ]);
    expect(ERROR_CATALOG.validation).toEqual({
      message: 'Os dados informados precisam de revisão.',
      suggestedAction: 'Corrigir os campos indicados e reenviar.',
      retryable: false,
    });
    expect(ERROR_CATALOG.network.retryable).toBe(true);
    expect(ERROR_CATALOG.timeout.retryable).toBe(true);
    expect(ERROR_CATALOG.server.retryable).toBe(true);
    expect(ERROR_CATALOG.authentication.retryable).toBe(false);
  });

  it('cobre as operações do inventário com rótulos locais', () => {
    const operationIds = Object.values(OPERATION_IDS);

    expect(operationIds.length).toBeGreaterThanOrEqual(42);
    expect(operationIds.every((operation) => getOperationLabel(operation))).toBe(
      true
    );
    expect(getOperationLabel('auth.login')).toBe('entrar');
    expect(getOperationLabel('registration.createMentor')).toBe(
      'cadastrar o usuário'
    );
  });

  it('mantém allowlists de credenciais e campos esperados', () => {
    expect(KNOWN_ERROR_CODES).toEqual(
      expect.arrayContaining([
        'password_required',
        'password_too_short',
        'password_too_long',
        'password_common',
        'password_confirmation_mismatch',
        'current_password_invalid',
        'password_reset_invalid',
        'credential_concurrency_conflict',
      ])
    );
    expect(EXPECTED_ERROR_FIELDS).toEqual(
      expect.arrayContaining([
        'email',
        'password',
        'currentPassword',
        'newPassword',
        'confirmation',
        'token',
        'nome',
        'repeat',
        'tipoUsuario',
        'telefone',
        'instituicao',
        'cidade',
        'curso',
        'emailMentor',
        'marca',
        'quantidade',
        'minimo',
        'capacidade',
        'localizacao',
        'formula',
        'catmat',
        'dataFabricacao',
        'dataValidade',
      ])
    );
    expect(getFieldErrorMessage('newPassword', 'password_common')).toBe(
      'Esta senha é muito comum. Escolha outra.'
    );
    expect(getFieldErrorMessage('unknown', 'password_common')).toBeUndefined();
    expect(getFieldErrorMessage('email', 'mensagem-remota')).toBe(
      'Verifique este campo.'
    );
  });
});
