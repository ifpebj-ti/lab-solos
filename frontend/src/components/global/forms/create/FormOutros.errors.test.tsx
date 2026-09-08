import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/test/msw/server';
import FormOutros from './FormOutros';

const API_URL = 'http://localhost:8080/api/produtos';
const SENTINEL = 'SENTINELA_TOKEN_SENHA_STACK';

const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/hooks/use-toast', () => ({ toast: toastMock }));

const selectDate = (trigger: HTMLElement) => {
  fireEvent.click(trigger);
  const day = Array.from(document.querySelectorAll('td button')).find(
    (button) =>
      button.textContent?.trim() &&
      !button.hasAttribute('disabled')
  );
  expect(day).toBeDefined();
  fireEvent.click(day as HTMLElement);
};

const fillForm = () => {
  fireEvent.change(screen.getByLabelText(/^Nome/), {
    target: { value: 'Material de teste' },
  });
  fireEvent.change(screen.getByLabelText(/^Quantidade(?! Mínima)/), {
    target: { value: '12' },
  });
  fireEvent.change(screen.getByLabelText(/^Quantidade Mínima/), {
    target: { value: '2' },
  });

  const dateTriggers = screen.getAllByRole('button', {
    name: 'Selecione uma data',
  });
  selectDate(dateTriggers[0]);
  selectDate(dateTriggers[1]);
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

describe('FormOutros: experiência de erros', () => {
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
        return HttpResponse.json({ id: 103 }, { status: 201 });
      })
    );

    render(<FormOutros />);
    fillForm();
    submitForm();

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({
        title: 'Produto criado',
        description: 'Verifique o estoque para validação...',
      });
    });

    expect(requestBody).toMatchObject({
      nomeProduto: 'Material de teste',
      tipo: 'Outro',
      quantidade: 12,
      quantidadeMinima: 2,
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

    render(<FormOutros />);
    fillForm();
    submitForm();

    const nameInput = await screen.findByLabelText(/^Nome/);
    await waitFor(() => expect(nameInput).toHaveAttribute('aria-invalid', 'true'));
    expect(nameInput).toHaveValue('Material de teste');
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
        return HttpResponse.json({ id: 103 }, { status: 201 });
      })
    );

    render(<FormOutros />);
    fillForm();
    submitForm();

    const submitButton = screen.getByRole('button', { name: 'Adicionar' });
    await waitFor(() => expect(submitButton).toBeDisabled());
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('Material de teste');

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

    render(<FormOutros />);
    fillForm();
    submitForm();

    await expectFailureToast(description);
    expect(document.cookie).toContain('doorKey=test-token');
    expect(window.location.pathname).toBe('/admin/insert');
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('Material de teste');
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeEnabled();
  });
});
