import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateOwnUserProfile } from '@/integration/Users';
import ProfileContactForm from './ProfileContactForm';

vi.mock('@/integration/Users', () => ({
  updateOwnUserProfile: vi.fn(),
}));

const user = {
  id: 7,
  nomeCompleto: 'Ada Lovelace',
  email: 'ada@example.com',
  telefone: null,
};

describe('ProfileContactForm', () => {
  const onSaved = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.mocked(updateOwnUserProfile).mockReset();
    vi.mocked(updateOwnUserProfile).mockResolvedValue(undefined);
    onSaved.mockReset();
    onCancel.mockReset();
  });

  it('solicita senha apenas ao trocar e-mail e a limpa ao concluir', async () => {
    render(
      <ProfileContactForm user={user} onSaved={onSaved} onCancel={onCancel} />
    );

    expect(screen.queryByLabelText('Senha atual')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'ada.new@example.com' },
    });
    expect(screen.getByLabelText('Senha atual')).toBeRequired();

    fireEvent.change(screen.getByLabelText('Senha atual'), {
      target: { value: 'transient-secret' },
    });
    fireEvent.change(screen.getByLabelText('Telefone'), {
      target: { value: '555-0123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(updateOwnUserProfile).toHaveBeenCalledWith({
      userId: 7,
      currentName: 'Ada Lovelace',
      currentEmail: 'ada@example.com',
      currentPhone: null,
      nomeCompleto: 'Ada Lovelace',
      email: 'ada.new@example.com',
      telefone: '555-0123',
      currentPassword: 'transient-secret',
    }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Perfil atualizado.'
    );
    expect(screen.getByLabelText('Senha atual')).toHaveValue('');
    expect(onSaved).toHaveBeenCalledWith({
      nomeCompleto: 'Ada Lovelace',
      email: 'ada.new@example.com',
      telefone: '555-0123',
    });
  });

  it('mantém nome e e-mail digitados e informa conflito sem expor resposta remota', async () => {
    vi.mocked(updateOwnUserProfile).mockRejectedValue({
      response: { status: 409, data: { code: 'profile_update_conflict' } },
    });
    render(
      <ProfileContactForm user={user} onSaved={onSaved} onCancel={onCancel} />
    );

    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'Ada Byron' },
    });
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'used@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha atual'), {
      target: { value: 'transient-secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este e-mail já está em uso. Os dados do perfil não foram alterados.'
    );
    expect(screen.getByLabelText('Nome completo')).toHaveValue('Ada Byron');
    expect(screen.getByLabelText('E-mail')).toHaveValue('used@example.com');
    expect(screen.getByLabelText('Senha atual')).toHaveValue('');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('mantém os dados após senha atual incorreta e exige nova confirmação', async () => {
    vi.mocked(updateOwnUserProfile).mockRejectedValue({
      response: {
        status: 400,
        data: {
          errors: {
            senhaAtual: ['current_password_invalid', 'Confirme a senha atual.'],
          },
        },
      },
    });
    render(
      <ProfileContactForm user={user} onSaved={onSaved} onCancel={onCancel} />
    );

    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'Ada Byron' },
    });
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'ada.new@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha atual'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A senha atual está incorreta. O perfil não foi alterado.'
    );
    expect(screen.getByLabelText('Nome completo')).toHaveValue('Ada Byron');
    expect(screen.getByLabelText('E-mail')).toHaveValue('ada.new@example.com');
    expect(screen.getByLabelText('Senha atual')).toHaveValue('');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('recusa submissão sem senha atual e limpa o segredo ao cancelar', async () => {
    const { unmount } = render(
      <ProfileContactForm user={user} onSaved={onSaved} onCancel={onCancel} />
    );
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'ada.new@example.com' },
    });
    fireEvent.submit(screen.getByRole('form', { name: 'Editar meu perfil' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe sua senha atual para alterar o e-mail.'
    );
    expect(updateOwnUserProfile).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Senha atual'), {
      target: { value: 'transient-secret' },
    });
    const passwordInput = screen.getByLabelText('Senha atual');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(passwordInput).toHaveValue('');
    expect(onCancel).toHaveBeenCalledOnce();

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'ada.new@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha atual'), {
      target: { value: 'another-secret' },
    });
    const mountedPasswordInput = screen.getByLabelText('Senha atual');
    unmount();
    expect(mountedPasswordInput).toHaveValue('');
  });
});
