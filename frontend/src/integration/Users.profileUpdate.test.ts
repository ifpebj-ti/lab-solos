import Cookie from 'js-cookie';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/services/BaseApi';
import { updateOwnUserProfile } from './Users';

vi.mock('@/services/BaseApi', () => ({ api: vi.fn() }));
vi.mock('js-cookie', () => ({ default: { get: vi.fn() } }));

describe('updateOwnUserProfile', () => {
  beforeEach(() => {
    vi.mocked(Cookie.get).mockReturnValue('session-token' as never);
    vi.mocked(api).mockReset();
    vi.mocked(api).mockResolvedValue({ data: {} });
  });

  it('envia somente os campos próprios alterados e nunca inclui status', async () => {
    await updateOwnUserProfile({
      userId: 7,
      currentName: 'Ada Lovelace',
      currentEmail: 'ada@example.com',
      currentPhone: null,
      nomeCompleto: 'Ada Byron',
      email: 'ada@example.com',
      telefone: '555-0123',
    });

    expect(api).toHaveBeenCalledWith({
      method: 'PATCH',
      url: 'Usuarios/7',
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json-patch+json',
      },
      data: [
        { op: 'replace', path: '/nomeCompleto', value: 'Ada Byron' },
        { op: 'replace', path: '/telefone', value: '555-0123' },
      ],
    });
  });

  it('inclui a senha atual somente junto da alteração de e-mail', async () => {
    await updateOwnUserProfile({
      userId: 7,
      currentName: 'Ada Lovelace',
      currentEmail: 'ada@example.com',
      currentPhone: null,
      nomeCompleto: 'Ada Lovelace',
      email: 'ada.new@example.com',
      telefone: null,
      currentPassword: 'transient-secret',
    });

    expect(api).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          { op: 'replace', path: '/email', value: 'ada.new@example.com' },
          { op: 'replace', path: '/senhaAtual', value: 'transient-secret' },
        ],
      })
    );
  });

  it('impede troca de e-mail sem senha antes de enviar a requisição', async () => {
    await expect(
      updateOwnUserProfile({
        userId: 7,
        currentName: 'Ada Lovelace',
        currentEmail: 'ada@example.com',
        currentPhone: null,
        nomeCompleto: 'Ada Lovelace',
        email: 'ada.new@example.com',
        telefone: null,
      })
    ).rejects.toThrow('Informe a senha atual para alterar o e-mail.');

    expect(api).not.toHaveBeenCalled();
  });
});
