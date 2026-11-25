import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/test/msw/server';
import { establishTestSession } from '@/test/session';
import FormOutros from './FormOutros';

const API_URL = 'http://localhost:8080/api/produtos';
const SENTINEL = 'SENTINELA_TOKEN_SENHA_STACK';

const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/hooks/use-toast', () => ({ toast: toastMock }));

const fillBasicForm = () => {
  fireEvent.change(screen.getByLabelText(/^Nome/), {
    target: { value: 'Material de teste' },
  });
  fireEvent.change(screen.getByLabelText(/^Quantidade(?! Mínima)/), {
    target: { value: '12' },
  });
  fireEvent.change(screen.getByLabelText(/^Quantidade Mínima/), {
    target: { value: '2' },
  });
};

const fillForm = () => {
  fillBasicForm();
  fireEvent.change(screen.getByRole('textbox', { name: 'Data de Fabricação' }), {
    target: { value: '13/11/2026' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Data de Validade' }), {
    target: { value: '31/12/2099' },
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
    establishTestSession('42', 'Administrador');
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
      dataFabricacao: '2026-11-13',
      dataValidade: '2099-12-31',
    });
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('');
    expect(screen.getByLabelText(/^Quantidade(?! Mínima)/)).toHaveValue(null);
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeEnabled();
  });

  it('permite digitar datas brasileiras e envia os dias civis em ISO', async () => {
    let requestBody: unknown;
    server.use(
      http.post(API_URL, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ id: 103 }, { status: 201 });
      })
    );

    render(<FormOutros />);
    fillBasicForm();
    fireEvent.change(screen.getByRole('textbox', { name: 'Data de Fabricação' }), {
      target: { value: '13/11/2026' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Data de Validade' }), {
      target: { value: '31/12/2099' },
    });
    submitForm();

    await waitFor(() => expect(requestBody).toMatchObject({
      dataFabricacao: '2026-11-13',
      dataValidade: '2099-12-31',
    }));
  });

  it.each(['31/02/2026', '01/01/0001'])('não envia data impossível ou sentinel %s', async (invalidDate) => {
    let requestCount = 0;
    server.use(
      http.post(API_URL, () => {
        requestCount += 1;
        return HttpResponse.json({ id: 103 }, { status: 201 });
      })
    );

    render(<FormOutros />);
    fillBasicForm();
    fireEvent.change(screen.getByRole('textbox', { name: 'Data de Fabricação' }), {
      target: { value: invalidDate },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Data de Validade' }), {
      target: { value: '31/12/2099' },
    });
    submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent('Data de fabricação inválida');
    expect(requestCount).toBe(0);
  });

  it('mantém obrigatoriedade e impede digitação de validade vencida', async () => {
    let requestCount = 0;
    server.use(
      http.post(API_URL, () => {
        requestCount += 1;
        return HttpResponse.json({ id: 103 }, { status: 201 });
      })
    );

    render(<FormOutros />);
    fillBasicForm();
    fireEvent.change(screen.getByRole('textbox', { name: 'Data de Validade' }), {
      target: { value: '01/01/2000' },
    });
    submitForm();

    expect(await screen.findByText('Data de fabricação inválida. Use dd/mm/aaaa.')).toBeInTheDocument();
    expect(await screen.findByText('Data de validade não pode ser anterior à data atual.')).toBeInTheDocument();
    expect(requestCount).toBe(0);
  });

  it('mantém a restrição de datas passadas somente na validade', () => {
    render(<FormOutros />);

    const openExpirationCalendar = screen.getByRole('button', {
      name: 'Abrir calendário: Data de Validade',
    });
    fireEvent.click(openExpirationCalendar);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Ano' }), {
      target: { value: '2000' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Mês' }), {
      target: { value: '0' },
    });
    const expirationCalendar = screen.getByRole('grid', { name: /janeiro 2000/i });
    expect(within(expirationCalendar).getByRole('gridcell', { name: '1' })).toBeDisabled();

    fireEvent.click(openExpirationCalendar);
    fireEvent.click(screen.getByRole('button', {
      name: 'Abrir calendário: Data de Fabricação',
    }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Ano' }), {
      target: { value: '2000' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Mês' }), {
      target: { value: '0' },
    });
    const manufacturingCalendar = screen.getByRole('grid', { name: /janeiro 2000/i });
    expect(within(manufacturingCalendar).getByRole('gridcell', { name: '1' })).toBeEnabled();
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
    expect(sessionStorage.getItem('auth:session-context')).toContain('42');
    expect(window.location.pathname).toBe('/admin/insert');
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('Material de teste');
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeEnabled();
  });
});
