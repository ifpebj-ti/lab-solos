import { describe, expect, it } from 'vitest';

import {
  ERROR_CATALOG,
  EXPECTED_ERROR_FIELDS,
  KNOWN_ERROR_CODES,
  OPERATION_IDS,
  getFieldErrorMessage,
  getRegistrationErrorMessage,
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
      'rate_limited',
      'request_too_large',
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
    expect(ERROR_CATALOG.request_too_large.message).toBe(
      'A solicitação excede o tamanho permitido.'
    );
    expect(ERROR_CATALOG.request_too_large.retryable).toBe(false);
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
        'profile_update_conflict',
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
    expect(getFieldErrorMessage('senhaAtual', 'current_password_invalid')).toBe(
      getFieldErrorMessage('currentPassword', 'current_password_invalid')
    );
  });

  it('mapeia somente os códigos públicos de cadastro para orientações aprovadas', () => {
    expect(KNOWN_ERROR_CODES).toEqual(
      expect.arrayContaining([
        'registration_account_invalid',
        'registration_responsible_invalid',
        'registration_conflict',
      ])
    );
    expect(getRegistrationErrorMessage('registration_conflict')).toBe(
      'Não foi possível concluir o cadastro com os dados informados.'
    );
    expect(
      getFieldErrorMessage('emailMentor', 'registration_responsible_invalid')
    ).toBe('Verifique o e-mail do responsável informado.');
    expect(getRegistrationErrorMessage('unknown_code')).toBeUndefined();
    expect(getRegistrationErrorMessage('__proto__')).toBeUndefined();
    expect(getRegistrationErrorMessage('toString')).toBeUndefined();
  });

  it('reconhece o código de confirmação de validade como código público', () => {
    expect(KNOWN_ERROR_CODES).toContain(
      'product_expiration_confirmation_required'
    );
  });

  it('reconhece os códigos públicos de API e empréstimos', () => {
    expect(KNOWN_ERROR_CODES).toEqual(expect.arrayContaining([
      'validation_failed',
      'authentication_required',
      'access_denied',
      'resource_not_found',
      'operation_conflict',
      'request_body_too_large',
      'admission_rate_limited',
      'service_unavailable',
      'operation_failed',
      'loan_decision_already_recorded',
      'loan_return_already_recorded',
      'loan_insufficient_stock',
      'loan_opposite_decision_recorded',
      'loan_concurrent_conflict',
      'loan_not_approved_for_return',
    ]));
  });
});
