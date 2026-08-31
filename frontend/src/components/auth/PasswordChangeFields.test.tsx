import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PasswordChangeFields from './PasswordChangeFields';

describe('PasswordChangeFields', () => {
  it('renderiza campos de senha reutilizáveis com atributos seguros', () => {
    render(<PasswordChangeFields />);

    const newPassword = screen.getByLabelText('Nova senha');
    const confirmation = screen.getByLabelText('Confirme a nova senha');

    expect(newPassword).toHaveAttribute('type', 'password');
    expect(newPassword).toHaveAttribute('name', 'newPassword');
    expect(newPassword).toHaveAttribute('autocomplete', 'new-password');
    expect(confirmation).toHaveAttribute('type', 'password');
    expect(confirmation).toHaveAttribute('name', 'confirmation');
    expect(confirmation).toHaveAttribute('autocomplete', 'new-password');
  });

  it('encaminha propriedades dos inputs para qualquer formulário consumidor', () => {
    const onChange = vi.fn();

    render(
      <PasswordChangeFields
        newPasswordInputProps={{ name: 'password', onChange }}
        confirmationInputProps={{ name: 'passwordConfirmation' }}
      />
    );

    fireEvent.change(screen.getByLabelText('Nova senha'), {
      target: { value: 'nova-senha-sem-composicao' },
    });

    expect(onChange).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute(
      'name',
      'password'
    );
    expect(screen.getByLabelText('Confirme a nova senha')).toHaveAttribute(
      'name',
      'passwordConfirmation'
    );
  });

  it('renderiza erros locais associados aos campos', () => {
    render(
      <PasswordChangeFields
        newPasswordError='A senha deve ter pelo menos 15 caracteres.'
        confirmationError='A confirmação da senha não corresponde.'
      />
    );

    expect(screen.getByLabelText('Nova senha')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(screen.getByLabelText('Confirme a nova senha')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('mapeia erro estruturado do servidor por código sem ecoar valor', () => {
    const secret = 'valor-que-nao-pode-ser-ecoado';

    const { rerender } = render(
      <PasswordChangeFields serverErrorCode='password_common' />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Esta senha é muito comum. Escolha outra.'
    );

    rerender(<PasswordChangeFields serverErrorCode={secret} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível validar a senha. Tente novamente.'
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent(secret);
  });
});
