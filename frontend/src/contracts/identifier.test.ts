import { describe, expect, it } from 'vitest';

import { parseResourceId } from './identifier';

describe('resource identifier contract', () => {
  it.each([1, 42, 2_147_483_647, '1', '42', '2147483647'])(
    'accepts %s as a numeric path segment',
    (id) => {
      expect(parseResourceId(id)).toBe(Number(id));
    }
  );

  it.each([
    null,
    undefined,
    true,
    false,
    {},
    [],
    0,
    -1,
    1.5,
    NaN,
    Infinity,
    2_147_483_648,
    Number.MAX_SAFE_INTEGER,
    '01',
    '1e2',
    '1.0',
    '+1',
    ' 1 ',
    '1/../Auth',
  ])('rejects invalid runtime value %s', (id) => {
    expect(() => parseResourceId(id)).toThrow('Identificador inv\u00e1lido.');
  });
});
