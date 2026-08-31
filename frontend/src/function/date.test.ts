import { describe, expect, it } from 'vitest';

import {
  displayUserValue,
  formatCivilDate,
  formatDate,
  formatDateTime,
} from './date';

describe('formatadores de instante existentes', () => {
  it('preserva a formatacao de data de outros dominios', () => {
    expect(formatDate('2026-08-31T12:34:56')).toBe('31/08/2026');
    expect(formatDate()).toBe('Data inválida');
  });

  it('preserva a formatacao de data e hora de outros dominios', () => {
    expect(formatDateTime('2026-08-31T12:34:56')).toBe('31/08/2026 12:34');
    expect(formatDateTime('invalida')).toBe('Data inválida');
  });
});

describe('formatCivilDate', () => {
  it.each([
    ['2024-02-29', '29/02/2024'],
    ['2026-08-31', '31/08/2026'],
  ])('formata %s sem converter para instante', (value, expected) => {
    expect(formatCivilDate(value)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    '',
    '2023-02-29',
    '2026-04-31',
    '2026-8-31',
    '2026-08-31T00:00:00Z',
  ])('retorna Nao informado para ausencia ou data invalida: %s', (value) => {
    expect(formatCivilDate(value)).toBe('Não informado');
  });
});

describe('displayUserValue', () => {
  it.each([null, undefined, '', '   ', 'Indefinido', ' indefinido '])(
    'traduz ausencia, vazio ou sentinela: %s',
    (value) => {
      expect(displayUserValue(value)).toBe('Não informado');
    }
  );

  it('preserva o valor real recebido', () => {
    expect(displayUserValue('  Belo Jardim  ')).toBe('  Belo Jardim  ');
    expect(displayUserValue('ES')).toBe('ES');
  });
});
