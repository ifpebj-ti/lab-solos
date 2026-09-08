import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/test/msw/server';
import FormVidrarias from './FormVidraria';

const API_URL = 'http://localhost:8080/api/produtos';
const SENTINEL = 'SENTINELA_TOKEN_SENHA_STACK';

const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/hooks/use-toast', () => ({ toast: toastMock }));

const fillForm = () => {
  fireEvent.change(screen.getByLabelText(/^Nome/), {
    target: { value: 'Béquer de vidro' },
  });
  fireEvent.change(screen.getByLabelText(/^Quantidade \(Un\)/), {
    target: { value: '12' },
  });
  fireEvent.change(screen.getByLabelText(/^Quantidade Mínima \(Un\)/), {
    target: { value: '2' },
  });
  fireEvent.change(screen.getByLabelText(/^Capacidade \(ml\)/), {
    target: { value: '500' },
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

describe('FormVidrarias: experiência de erros', () => {
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
        return HttpResponse.json({ id: 101 }, { status: 201 });
      })
    );

    render(<FormVidrarias />);
    fillForm();
    submitForm();

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({
        title: 'Produto criado',
        description: 'Verifique o estoque para validação...',
      });
    });

    expect(requestBody).toMatchObject({
      nomeProduto: 'Béquer de vidro',
      tipo: 'Vidraria',
      quantidade: 12,
      quantidadeMinima: 2,
      capacidade: 500,
    });
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('');
    expect(screen.getByLabelText(/^Quantidade \(Un\)/)).toHaveValue(null);
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

    render(<FormVidrarias />);
    fillForm();
    submitForm();

    const nameInput = await screen.findByLabelText(/^Nome/);
    await waitFor(() => expect(nameInput).toHaveAttribute('aria-invalid', 'true'));
    expect(nameInput).toHaveValue('Béquer de vidro');
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
        return HttpResponse.json({ id: 101 }, { status: 201 });
      })
    );

    render(<FormVidrarias />);
    fillForm();
    submitForm();

    const submitButton = screen.getByRole('button', { name: 'Adicionar' });
    await waitFor(() => expect(submitButton).toBeDisabled());
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('Béquer de vidro');

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

    render(<FormVidrarias />);
    fillForm();
    submitForm();

    await expectFailureToast(description);
    expect(document.cookie).toContain('doorKey=test-token');
    expect(window.location.pathname).toBe('/admin/insert');
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('Béquer de vidro');
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeEnabled();
  });
});
