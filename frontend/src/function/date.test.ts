import { describe, expect, it } from 'vitest';

import {
  displayUserValue,
  formatCivilDate,
  formatDate,
  formatDateTime,
  parseCivilDateInput,
} from './date';

describe('parseCivilDateInput', () => {
  it.each([
    ['29/02/2000', '2000-02-29'],
    ['05/11/2026', '2026-11-05'],
    ['02/01/0001', '0001-01-02'],
  ])('converte %s para o dia civil', (value, expected) => {
    expect(parseCivilDateInput(value)).toBe(expected);
  });

  it.each(['31/02/2026', '29/02/1900', '01/01/0000', '01/01/0001', '05/11/20', '2026-11-05', ''])(
    'recusa a digitação inválida ou incompleta %s',
    (value) => expect(parseCivilDateInput(value)).toBeUndefined()
  );
});

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
    ['2026-11-05', '05/11/2026'],
  ])('formata %s sem converter para instante', (value, expected) => {
    expect(formatCivilDate(value)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    '',
    '0001-01-01',
    '2023-02-29',
    '2026-04-31',
    '2026-8-31',
    '11/13/2026',
    '13/11/2026',
    '11/13/2026 00:00:00',
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
