import Cookie from 'js-cookie';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/services/BaseApi';
import { getDependentesID, getLoansByClass } from './Class';

vi.mock('@/services/BaseApi', () => ({ api: vi.fn() }));
vi.mock('js-cookie', () => ({ default: { get: vi.fn() } }));

const requests = [
  ['linked dependents', (id: string) => getDependentesID(id)],
  ['class loans', (id: string) => getLoansByClass({ id })],
] as const;
const invalidIdentifiers = [
  '../Auth/logout',
  '1/../../Auth/logout',
  '%2e%2e%2fAuth',
  '1?redirect=/Auth',
  '1#fragment',
  '//example.invalid',
  '0',
  '-1',
  '1.5',
  '1e2',
  '0x10',
  ' 1 ',
  '',
  '2147483648',
];

describe('class request identifiers cannot change the API endpoint', () => {
  beforeEach(() => {
    vi.mocked(Cookie.get).mockReturnValue('synthetic-token' as never);
    vi.mocked(api).mockReset();
    vi.mocked(api).mockResolvedValue({ data: [] });
  });

  for (const [name, request] of requests) {
    it.each(invalidIdentifiers)(
      `${name} rejects %s before HTTP`,
      async (id) => {
        await expect(request(id)).rejects.toBeDefined();
        expect(api).not.toHaveBeenCalled();
      }
    );
  }

  it.each(['1', '2147483647'])(
    'preserves dependents endpoint and response for %s',
    async (id) => {
      await expect(getDependentesID(id)).resolves.toEqual([]);
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: `Usuarios/${id}/dependentes`,
        })
      );
    }
  );

  it.each([42, '42'])(
    'preserves class loans endpoint and response for %s',
    async (id) => {
      await expect(getLoansByClass({ id })).resolves.toEqual([]);
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'Usuarios/42/dependentes/emprestimos',
        })
      );
    }
  );
});
