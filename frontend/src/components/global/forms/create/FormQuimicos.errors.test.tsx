import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/test/msw/server';
import FormQuimicos from './FormQuimicos';

const API_URL = 'http://localhost:8080/api/produtos';
const SENTINEL = 'SENTINELA_TOKEN_SENHA_STACK';

const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/hooks/use-toast', () => ({ toast: toastMock }));

type SelectOption = { value: string; label: string };

vi.mock('../../inputs/SelectInput', () => ({
  default: ({
    label,
    options,
    onValueChange,
  }: {
    label: string;
    options: SelectOption[];
    onValueChange: (value: string) => void;
  }) => (
    <label>
      {label}
      <select
        aria-label={label}
        defaultValue=''
        onChange={(event) => onValueChange(event.currentTarget.value)}
      >
        <option value=''>Selecione</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

vi.mock('../../inputs/PopoverInput', () => ({
  default: ({
    unidades,
    value,
    onChange,
    title = 'Medida',
  }: {
    unidades: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    title?: string;
  }) => (
    <label>
      {title}
      <select
        aria-label={title}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        <option value=''>Selecione</option>
        {unidades.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

vi.mock('../../inputs/DateInput', () => ({
  default: ({
    nome,
    name,
    setValue,
  }: {
    nome: string;
    name: string;
    setValue: (name: string, value: string) => void;
  }) => (
    <label>
      {nome}
      <input
        aria-label={nome}
        name={name}
        type='date'
        onChange={(event) => setValue(name, event.currentTarget.value)}
      />
    </label>
  ),
}));

const fillForm = () => {
  fireEvent.change(screen.getByLabelText(/^Nome/), {
    target: { value: 'Ácido de teste' },
  });
  fireEvent.change(screen.getByLabelText(/^Fórmula Química/), {
    target: { value: 'H2O' },
  });
  fireEvent.change(screen.getByLabelText(/^Quantidade(?! Mínima)/), {
    target: { value: '12' },
  });
  fireEvent.change(screen.getByLabelText(/^Quantidade Mínima/), {
    target: { value: '2' },
  });

  fireEvent.change(screen.getByLabelText('Grupo'), {
    target: { value: 'Acido' },
  });
  fireEvent.change(screen.getByLabelText('Medida'), {
    target: { value: 'Litro' },
  });
  fireEvent.change(screen.getByLabelText('Data de Fabricação'), {
    target: { value: '2026-08-30' },
  });
  fireEvent.change(screen.getByLabelText('Data de Validade'), {
    target: { value: '2026-09-08' },
  });
};

const submitForm = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

const expectFailureToast = async (description: string) => {
  await waitFor(() => {
    expect(toastMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: 'Não foi possível criar o produto',
        description: expect.stringContaining(description),
        variant: 'destructive',
      })
    );
  });
  expect(JSON.stringify(toastMock.mock.calls)).not.toContain(SENTINEL);
};

describe('FormQuimicos: experiência de erros', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    document.cookie = 'doorKey=test-token; path=/';
    window.history.replaceState({}, '', '/admin/insert');
  });

  it('caracteriza criação bem-sucedida e mantém o reset existente', async () => {
    let requestBody: unknown;
    server.use(
      http.post(API_URL, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ id: 102 }, { status: 201 });
      })
    );

    render(<FormQuimicos />);
    await fillForm();
    submitForm();

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({
        title: 'Produto criado',
        description: 'Verifique o estoque para validação...',
      });
    });

    expect(requestBody).toMatchObject({
      nomeProduto: 'Ácido de teste',
      tipo: 'Quimico',
      quantidade: 12,
      quantidadeMinima: 2,
      formulaQuimica: 'H2O',
      unidadeMedida: 'Litro',
      grupo: 'Acido',
    });
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('');
    expect(screen.getByLabelText(/^Quantidade(?! Mínima)/)).toHaveValue(null);
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeEnabled();
  });

  it('aplica fieldErrors reconhecidos, preserva valores e anuncia o resumo', async () => {
    server.use(
      http.post(API_URL, () =>
        HttpResponse.json(
          {
            title: SENTINEL,
            detail: SENTINEL,
            errors: { nome: [SENTINEL] },
          },
          { status: 422 }
        )
      )
    );

    render(<FormQuimicos />);
    await fillForm();
    submitForm();

    const nameInput = await screen.findByLabelText(/^Nome/);
    await waitFor(() => expect(nameInput).toHaveAttribute('aria-invalid', 'true'));
    expect(nameInput).toHaveValue('Ácido de teste');
    expect(nameInput).toHaveAttribute('aria-describedby', 'nome-error');
    expect(screen.getByText('Verifique este campo.')).toBeInTheDocument();
    expect(nameInput).toHaveFocus();
    await expectFailureToast('Os dados informados precisam de revisão.');
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeEnabled();
  });

  it('mantém o formulário aberto e encerra o pending após indisponibilidade', async () => {
    let releaseRequest!: () => void;
    const requestGate = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    server.use(
      http.post(API_URL, async () => {
        await requestGate;
        return HttpResponse.json({ id: 102 }, { status: 201 });
      })
    );

    render(<FormQuimicos />);
    await fillForm();
    submitForm();

    const submitButton = screen.getByRole('button', { name: 'Adicionar' });
    await waitFor(() => expect(submitButton).toBeDisabled());
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('Ácido de teste');

    releaseRequest();
    await waitFor(() => expect(submitButton).toBeEnabled());
  });

  it.each([
    {
      label: '403',
      response: () => HttpResponse.json({ message: SENTINEL }, { status: 403 }),
      description: 'Você não tem permissão para esta ação.',
    },
    {
      label: '409',
      response: () => HttpResponse.json({ message: SENTINEL }, { status: 409 }),
      description: 'Atualizar os dados antes de tentar novamente.',
    },
    {
      label: 'rede',
      response: () => HttpResponse.error(),
      description: 'Não foi possível conectar ao serviço.',
    },
  ])('trata falha $label sem logout nem texto remoto', async ({ response, description }) => {
    server.use(http.post(API_URL, response));

    render(<FormQuimicos />);
    await fillForm();
    submitForm();

    await expectFailureToast(description);
    expect(document.cookie).toContain('doorKey=test-token');
    expect(window.location.pathname).toBe('/admin/insert');
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('Ácido de teste');
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeEnabled();
  });
});
