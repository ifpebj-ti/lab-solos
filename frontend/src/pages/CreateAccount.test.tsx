import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApplicationError } from '@/errors/applicationError';
import { createMentor } from '@/integration/Auth';
import CreateAccount from './CreateAccount';

vi.mock('@/integration/Auth', () => ({
  createMentor: vi.fn(),
}));

vi.mock('@/auth/session', () => ({
  clearSession: vi.fn(),
}));

vi.mock('@/components/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: () => <input type='checkbox' />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange: (value: string) => void;
  }) => (
    <div>
      <button type='button' onClick={() => onValueChange('mentor')}>
        Selecionar Mentor
      </button>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

function renderCreateAccount() {
  return render(
    <MemoryRouter>
      <CreateAccount />
    </MemoryRouter>
  );
}

function fillValidForm({
  cidade = '  Belo Jardim  ',
  curso = '  ES  ',
}: { cidade?: string; curso?: string } = {}) {
  const password = document.querySelector<HTMLInputElement>(
    'input[name="senha"]'
  );
  const passwordConfirmation = document.querySelector<HTMLInputElement>(
    'input[name="repeat"]'
  );

  if (!password || !passwordConfirmation) {
    throw new Error('Campos de senha não encontrados.');
  }

  fireEvent.change(screen.getByRole('textbox', { name: /nome completo/i }), {
    target: { value: 'Maria Silva' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: /^email$/i }), {
    target: { value: 'maria@example.com' },
  });
  fireEvent.change(password, {
    target: { value: 'Senha123' },
  });
  fireEvent.change(passwordConfirmation, {
    target: { value: 'Senha123' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: /instituição/i }), {
    target: { value: 'IFPE' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: /cidade/i }), {
    target: { value: cidade },
  });
  fireEvent.change(screen.getByRole('textbox', { name: /curso/i }), {
    target: { value: curso },
  });
  fireEvent.change(screen.getByRole('textbox', { name: /telefone/i }), {
    target: { value: '81999999999' },
  });
  fireEvent.change(
    screen.getByRole('textbox', { name: /email do mentor responsável/i }),
    { target: { value: 'mentor@example.com' } }
  );
  fireEvent.click(screen.getByRole('button', { name: /selecionar mentor/i }));
}

describe('CreateAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('abre termos sem submeter cadastro válido e devolve foco ao fechar', async () => {
    renderCreateAccount();
    fillValidForm();
    const trigger = screen.getByRole('button', { name: /termos e condições/i });
    expect(trigger).toHaveAttribute('type', 'button');
    trigger.focus();
    fireEvent.click(trigger);
    expect(await screen.findByRole('dialog')).toHaveAccessibleName(
      'TERMOS E CONDIÇÕES DE USO'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(createMentor).not.toHaveBeenCalled();
  });

  it('exibe um campo Cidade obrigatorio', () => {
    renderCreateAccount();

    expect(screen.getByRole('textbox', { name: /cidade/i })).toBeRequired();
  });

  it('envia cidade e curso normalizados sem fabricar sentinela', async () => {
    const legacyCitySentinel = 'Indefinido';
    vi.mocked(createMentor).mockResolvedValue({ status: 201 } as never);
    renderCreateAccount();
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => {
      expect(createMentor).toHaveBeenCalledWith(
        expect.objectContaining({
          cidade: 'Belo Jardim',
          curso: 'ES',
        })
      );
    });
    expect(createMentor).not.toHaveBeenCalledWith(
      expect.objectContaining({ cidade: legacyCitySentinel })
    );
  });

  it('bloqueia cidade sentinela e curso fora do limite com erros de campo', async () => {
    renderCreateAccount();
    fillValidForm({ cidade: ' indefinido ', curso: 'E' });

    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(await screen.findByText('Informe uma cidade válida.')).toBeVisible();
    expect(
      screen.getByText('O curso deve ter entre 2 e 100 caracteres.')
    ).toBeVisible();
    expect(createMentor).not.toHaveBeenCalled();
  });

  it('associa erros do backend aos campos cidade e curso', async () => {
    const backendError = createApplicationError({
      category: 'validation',
      message: 'SENTINELA_REMOTA',
      fieldErrors: {
        cidade: ['Verifique este campo.'],
        curso: ['Verifique este campo.'],
      },
      retryable: false,
    });
    vi.mocked(createMentor).mockRejectedValue(backendError);
    renderCreateAccount();
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    const summary = await screen.findByRole('alert', {
      name: /N.o foi poss.vel cadastrar o usu.rio/i,
    });
    expect(summary).toHaveTextContent('Verifique este campo.');
    expect(summary).not.toHaveTextContent('SENTINELA_REMOTA');

    const cityError = screen.getByText('Verifique este campo.', {
      selector: '#cidade-error',
    });
    const courseError = screen.getByText('Verifique este campo.', {
      selector: '#curso-error',
    });
    expect(screen.getByRole('textbox', { name: /cidade/i })).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(screen.getByRole('textbox', { name: /cidade/i })).toHaveAttribute(
      'aria-describedby',
      cityError.id
    );
    expect(screen.getByRole('textbox', { name: /curso/i })).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(screen.getByRole('textbox', { name: /curso/i })).toHaveAttribute(
      'aria-describedby',
      courseError.id
    );
  });

  it('mantém valores, oferece nova tentativa e reabilita o envio após falha do servidor', async () => {
    let rejectRequest: (reason: unknown) => void = () => undefined;
    const pendingRequest = new Promise<never>((_, reject) => {
      rejectRequest = reject;
    });
    vi.mocked(createMentor)
      .mockReturnValueOnce(pendingRequest as never)
      .mockResolvedValueOnce({ status: 201 } as never);
    renderCreateAccount();
    fillValidForm();

    const submitButton = screen.getByRole('button', { name: /criar conta/i });
    fireEvent.click(submitButton);
    await waitFor(() => expect(submitButton).toBeDisabled());

    rejectRequest(
      createApplicationError({
        category: 'server',
        message: 'SENTINELA_TOKEN_SENHA_STACK',
        retryable: true,
      })
    );

    const summary = await screen.findByRole('alert', {
      name: /N.o foi poss.vel cadastrar o usu.rio/i,
    });
    expect(summary).toHaveTextContent('Tentar novamente mais tarde.');
    expect(summary).not.toHaveTextContent('SENTINELA_TOKEN_SENHA_STACK');
    expect(submitButton).toBeEnabled();
    expect(screen.getByRole('textbox', { name: /cidade/i })).toHaveValue(
      '  Belo Jardim  '
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(createMentor).toHaveBeenCalledTimes(2));
  });
});
