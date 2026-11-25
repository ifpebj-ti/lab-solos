import { beforeEach, describe, expect, it, vi } from 'vitest';

import { startSession } from '@/auth/session';
import { api } from '@/services/BaseApi';
import {
  approveLoan,
  getLoansById,
  getLoansByUserId,
  rejectLoan,
  returnLoan,
} from './Loans';
import {
  getProductById,
  getProductHistoricoSaida,
  updateProduct,
} from './Product';

vi.mock('@/services/BaseApi', () => ({ api: vi.fn() }));

const requests = [
  ['product', (id: string) => getProductById({ id: id as unknown as number })],
  [
    'product history',
    (id: string) => getProductHistoricoSaida({ id: id as unknown as number }),
  ],
  [
    'product update',
    (id: string) =>
      updateProduct({ id: id as unknown as number, operations: [] }),
  ],
  ['user loans', (id: string) => getLoansByUserId({ id })],
  ['loan', (id: string) => getLoansById({ id })],
  ['loan approval', approveLoan],
  ['loan rejection', rejectLoan],
  ['loan return', returnLoan],
] as const;

describe('resource identifiers cannot change API endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startSession({
      userId: '7',
      role: 'admin',
      requiresPasswordChange: false,
      csrfToken: 'synthetic-token',
    });
    vi.mocked(api).mockResolvedValue({ data: {} });
  });

  it.each(requests)(
    'rejects invalid identifiers before HTTP: %s',
    async (_label, request) => {
      for (const id of [
        '../Auth',
        '1/../../Auth',
        '%2e%2e%2fAuth',
        '1?x=2',
        '1#fragment',
        '//example.invalid',
        '0',
        '-1',
        '1.5',
        '1e2',
        ' 1 ',
        '',
        '2147483648',
      ]) {
        await expect(request(id)).rejects.toBeDefined();
      }
      expect(api).not.toHaveBeenCalled();
    }
  );

  it.each(requests)(
    'uses a canonical numeric path segment: %s',
    async (_label, request) => {
      await request('42').catch(() => undefined);
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringMatching(/(?:^|\/)42(?:\/|$)/),
        })
      );
    }
  );

  it.each([approveLoan, rejectLoan])(
    'rejects a forged approver identifier before HTTP',
    async (request) => {
      startSession({
        userId: '../Auth',
        role: 'admin',
        requiresPasswordChange: false,
        csrfToken: 'synthetic-token',
      });
      await expect(request(42)).rejects.toBeDefined();
      expect(api).not.toHaveBeenCalled();
    }
  );
});
