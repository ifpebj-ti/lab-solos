import Cookie from 'js-cookie';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/services/BaseApi';
import {
  approveDependente,
  getDependentesForApproval,
  getUserById,
  getUserForMentoring,
  rejectDependente,
  updateOwnUserProfile,
  updateUserStatus,
} from './Users';

vi.mock('@/services/BaseApi', () => ({ api: vi.fn() }));
vi.mock('js-cookie', () => ({ default: { get: vi.fn() } }));

const ownProfile = (userId: number) => ({
  userId,
  currentName: 'Synthetic User',
  currentEmail: 'synthetic@example.invalid',
  currentPhone: null,
  nomeCompleto: 'Updated Synthetic User',
  email: 'synthetic@example.invalid',
  telefone: null,
});

const requests = [
  ['mentoring user', (id: string) => getUserForMentoring({ id })],
  ['user details', (id: string) => getUserById({ id })],
  ['pending dependents', (id: string) => getDependentesForApproval(id)],
  ['approve dependent', (id: string) => approveDependente(id)],
  ['reject dependent', (id: string) => rejectDependente(id)],
  [
    'user status',
    (id: string) =>
      updateUserStatus({
        userId: id as unknown as number,
        status: 'Habilitado',
      }),
  ],
  [
    'own profile',
    (id: string) => updateOwnUserProfile(ownProfile(id as unknown as number)),
  ],
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

describe('user request identifiers cannot change the API endpoint', () => {
  beforeEach(() => {
    vi.mocked(Cookie.get).mockImplementation(
      (name?: string) => (name === 'rankID' ? '7' : 'synthetic-token') as never
    );
    vi.mocked(api).mockReset();
    vi.mocked(api).mockResolvedValue({ data: {} });
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

  it.each([42, '42'])(
    'preserves the mentoring response and numeric URL for %s',
    async (id) => {
      const user = {
        id: 42,
        nomeCompleto: 'Synthetic User',
        email: 'synthetic@example.invalid',
        telefone: null,
        dataIngresso: null,
        status: 'Habilitado',
        nivelUsuario: 'Mentorado',
        cidade: null,
        curso: null,
        instituicao: null,
      };
      vi.mocked(api).mockResolvedValue({ data: user });
      await expect(getUserForMentoring({ id })).resolves.toEqual(user);
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'GET', url: 'Usuarios/42' })
      );
    }
  );

  it('rejects a forged approver cookie before HTTP', async () => {
    vi.mocked(Cookie.get).mockImplementation(
      (name?: string) =>
        (name === 'rankID' ? '../Auth' : 'synthetic-token') as never
    );
    await expect(approveDependente(42)).rejects.toBeDefined();
    expect(api).not.toHaveBeenCalled();
  });
});
