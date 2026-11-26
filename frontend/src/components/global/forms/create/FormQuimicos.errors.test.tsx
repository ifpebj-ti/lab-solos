import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/test/msw/server';
import { establishTestSession } from '@/test/session';
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
    error,
  }: {
    label: string;
    options: SelectOption[];
    onValueChange: (value: string) => void;
    error?: string;
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
      {error && <span role='alert'>{error}</span>}
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
  fireEvent.change(screen.getByRole('textbox', { name: 'Data de Fabricação' }), {
    target: { value: '30/08/2026' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Data de Validade' }), {
    target: { value: '08/09/2026' },
  });
};

const submitForm = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

const expiredProblem = (
  diaCivil = '2026-09-09',
  dataValidade = '2026-09-08'
) =>
  HttpResponse.json(
    {
      status: 409,
      title: 'Confirme o cadastro do químico vencido.',
      detail: 'Confirme a data de validade informada para continuar com o cadastro.',
      code: 'product_expiration_confirmation_required',
      correlationId: 'server-correlation-id',
      dataValidade,
      diaCivil,
    },
    { status: 409 }
  );

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
    establishTestSession('42', 'Administrador');
    window.history.replaceState({}, '', '/admin/insert');
  });

  it('oferece apenas grupos elegíveis e dispensa CATMAT', () => {
    render(<FormQuimicos />);

    const grupo = within(screen.getByRole('combobox', { name: 'Grupo' }));
    expect.soft(
      grupo.getAllByRole('option').map((option) => option.getAttribute('value'))
    ).toEqual(['', 'Acido', 'Base', 'Oxido', 'Sal', 'Hidroxido', 'Outros']);
    expect(screen.queryByLabelText(/^catmat$/i)).not.toBeInTheDocument();
  });

  it('envia Marca pelo contrato fornecedor, dispensa CATMAT e mantém o reset', async () => {
    let requestBody: unknown;
    server.use(
      http.post(API_URL, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ id: 102 }, { status: 201 });
      })
    );

    render(<FormQuimicos />);
    await fillForm();
    fireEvent.change(screen.getByLabelText('Marca'), {
      target: { value: 'Marca sintética' },
    });
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
      fornecedor: 'Marca sintética',
      dataFabricacao: '2026-08-30',
      dataValidade: '2026-09-08',
    });
    expect(requestBody).not.toHaveProperty('catmat');
    expect(requestBody).not.toHaveProperty('pesoMolecular');
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('');
    expect(screen.getByLabelText(/^Quantidade(?! Mínima)/)).toHaveValue(null);
    expect(screen.getByRole('textbox', { name: 'Data de Fabricação' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Data de Validade' })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeEnabled();
  });

  it('pergunta antes de cadastrar vencido e cancelar mantém o formulário sem gravar', async () => {
    const requests: unknown[] = [];
    server.use(
      http.post(API_URL, async ({ request }) => {
        requests.push(await request.json());
        return expiredProblem();
      })
    );

    render(<FormQuimicos />);
    await fillForm();
    submitForm();

    const dialog = await screen.findByRole('alertdialog', {
      name: 'Produto vencido',
    });
    expect(dialog).toHaveTextContent('08/09/2026');
    expect(dialog).toHaveTextContent('09/09/2026');
    expect(toastMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('Ácido de teste');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Adicionar' })).toHaveFocus()
    );
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('Ácido de teste');
    expect(screen.getByRole('textbox', { name: 'Data de Validade' })).toHaveValue(
      '08/09/2026'
    );
    expect(requests).toHaveLength(1);
  });

  it('preserva o foco do campo que iniciou o envio ao cancelar a confirmação', async () => {
    server.use(http.post(API_URL, () => expiredProblem()));

    render(<FormQuimicos />);
    await fillForm();

    const nameField = screen.getByLabelText(/^Nome/);
    nameField.focus();
    fireEvent.submit(nameField.closest('form')!);

    const dialog = await screen.findByRole('alertdialog', {
      name: 'Produto vencido',
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(nameField).toHaveFocus());
  });

  it('permite fechar a confirmação pelo teclado e devolve o foco ao formulário', async () => {
    server.use(http.post(API_URL, () => expiredProblem()));

    render(<FormQuimicos />);
    await fillForm();
    submitForm();

    const dialog = await screen.findByRole('alertdialog', {
      name: 'Produto vencido',
    });
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Adicionar' })).toHaveFocus()
    );
    expect(screen.getByRole('textbox', { name: 'Data de Validade' })).toHaveValue(
      '08/09/2026'
    );
  });

  it('revalida o dia do servidor e envia uma confirmação da data exata uma vez', async () => {
    const requests: Array<Record<string, unknown>> = [];
    server.use(
      http.post(API_URL, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        requests.push(body);
        if (requests.length < 3) return expiredProblem();
        return HttpResponse.json({ id: 102 }, { status: 201 });
      })
    );

    render(<FormQuimicos />);
    await fillForm();
    submitForm();

    const dialog = await screen.findByRole('alertdialog', {
      name: 'Produto vencido',
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Adicionar mesmo assim' })
    );

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith({
      title: 'Produto criado',
      description: 'Verifique o estoque para validação...',
    }));
    expect(requests).toHaveLength(3);
    expect(requests[1]).not.toHaveProperty('dataValidadeConfirmada');
    expect(requests[2]).toHaveProperty('dataValidadeConfirmada', '2026-09-08');
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('');
  });

  it('exige um novo aceite quando a revalidação informa que o dia civil mudou', async () => {
    const requests: Array<Record<string, unknown>> = [];
    server.use(
      http.post(API_URL, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        requests.push(body);
        if (requests.length === 1) return expiredProblem('2026-09-09');
        if (requests.length === 2 || requests.length === 3)
          return expiredProblem('2026-09-10');
        return HttpResponse.json({ id: 102 }, { status: 201 });
      })
    );

    render(<FormQuimicos />);
    await fillForm();
    submitForm();

    let dialog = await screen.findByRole('alertdialog', {
      name: 'Produto vencido',
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Adicionar mesmo assim' })
    );

    await waitFor(() => expect(dialog).toHaveTextContent('10/09/2026'));
    expect(requests).toHaveLength(2);
    expect(requests[1]).not.toHaveProperty('dataValidadeConfirmada');

    dialog = screen.getByRole('alertdialog', { name: 'Produto vencido' });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Adicionar mesmo assim' })
    );

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith({
      title: 'Produto criado',
      description: 'Verifique o estoque para validação...',
    }));
    expect(requests).toHaveLength(4);
    expect(requests[2]).not.toHaveProperty('dataValidadeConfirmada');
    expect(requests[3]).toHaveProperty('dataValidadeConfirmada', '2026-09-08');
  });

  it('descarta a confirmação se a validade mudar enquanto o diálogo está aberto', async () => {
    const requests: Array<Record<string, unknown>> = [];
    server.use(
      http.post(API_URL, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        requests.push(body);
        if (requests.length === 1)
          return expiredProblem('2026-09-09', '2026-09-08');
        if (requests.length === 2 || requests.length === 3)
          return expiredProblem('2026-09-09', '2026-09-09');
        return HttpResponse.json({ id: 102 }, { status: 201 });
      })
    );

    render(<FormQuimicos />);
    await fillForm();
    submitForm();

    await screen.findByRole('alertdialog', { name: 'Produto vencido' });
    const validity = document.querySelector<HTMLInputElement>('#dataValidade');
    expect(validity).not.toBeNull();
    if (!validity) throw new Error('Campo de validade ausente');
    fireEvent.change(validity, { target: { value: '09/09/2026' } });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

    submitForm();
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Produto vencido',
    });
    expect(requests[1]).toHaveProperty('dataValidade', '2026-09-09');
    expect(requests[1]).not.toHaveProperty('dataValidadeConfirmada');

    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Adicionar mesmo assim' })
    );
    await waitFor(() => expect(requests).toHaveLength(4));
    expect(requests[3]).toHaveProperty('dataValidadeConfirmada', '2026-09-09');
  });

  it('descarta a confirmação se os dados mudarem durante a revalidação', async () => {
    let releaseRevalidation!: () => void;
    const revalidationGate = new Promise<void>((resolve) => {
      releaseRevalidation = resolve;
    });
    const requests: Array<Record<string, unknown>> = [];
    server.use(
      http.post(API_URL, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        requests.push(body);
        if (requests.length === 1) return expiredProblem();
        if (requests.length === 2) {
          await revalidationGate;
          return expiredProblem();
        }
        return HttpResponse.json({ id: 102 }, { status: 201 });
      })
    );

    render(<FormQuimicos />);
    await fillForm();
    submitForm();
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Produto vencido',
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Adicionar mesmo assim' })
    );
    await waitFor(() => expect(requests).toHaveLength(2));

    const validity = document.querySelector<HTMLInputElement>('#dataValidade');
    expect(validity).not.toBeNull();
    if (!validity) throw new Error('Campo de validade ausente');
    fireEvent.change(validity, { target: { value: '09/09/2026' } });
    releaseRevalidation();

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(requests).toHaveLength(2);
    expect(requests.every((request) => !('dataValidadeConfirmada' in request))).toBe(true);
    expect(screen.getByRole('textbox', { name: 'Data de Validade' })).toHaveValue(
      '09/09/2026'
    );
  });

  it('não envia confirmações duplicadas enquanto revalida o dia', async () => {
    let releaseRevalidation!: () => void;
    const revalidationGate = new Promise<void>((resolve) => {
      releaseRevalidation = resolve;
    });
    const requests: unknown[] = [];
    server.use(
      http.post(API_URL, async ({ request }) => {
        requests.push(await request.json());
        if (requests.length === 1) return expiredProblem();
        if (requests.length === 2) {
          await revalidationGate;
          return expiredProblem();
        }
        return HttpResponse.json({ id: 102 }, { status: 201 });
      })
    );

    render(<FormQuimicos />);
    await fillForm();
    submitForm();
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Produto vencido',
    });
    const confirm = within(dialog).getByRole('button', {
      name: 'Adicionar mesmo assim',
    });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => expect(confirm).toBeDisabled());
    expect(requests).toHaveLength(2);
    releaseRevalidation();
    await waitFor(() => expect(requests).toHaveLength(3));
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: 'Produto criado',
        description: 'Verifique o estoque para validação...',
      })
    );
  });

  it('envia Peso Molecular com vírgula decimal como número e sem valor sentinela', async () => {
    let requestBody: unknown;
    server.use(
      http.post(API_URL, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ id: 102 }, { status: 201 });
      })
    );

    render(<FormQuimicos />);
    await fillForm();
    fireEvent.change(screen.getByLabelText('Peso Molecular (g/mol)'), {
      target: { value: '18,015' },
    });
    submitForm();

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({
        title: 'Produto criado',
        description: 'Verifique o estoque para validação...',
      });
    });

    expect(requestBody).toMatchObject({ pesoMolecular: 18.015 });
  });

  it.each(['0', '0,0009', '10000,001', '18,1234', '-1', 'texto'])(
    'não envia Peso Molecular inválido: %s',
    async (pesoMolecular) => {
      const onCreate = vi.fn(() => HttpResponse.json({ id: 102 }, { status: 201 }));
      server.use(http.post(API_URL, onCreate));

      render(<FormQuimicos />);
      await fillForm();
      const field = screen.getByLabelText('Peso Molecular (g/mol)');
      fireEvent.change(field, { target: { value: pesoMolecular } });
      submitForm();

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /Peso Molecular.*0,001.*10\.000.*três casas decimais/i
      );
      expect(field).toHaveAttribute('aria-invalid', 'true');
      expect(field).toHaveFocus();
      expect(onCreate).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['Data de Fabricação', '31/02/2026', /data de fabricação inválida/i],
    ['Data de Validade', '29/02/20', /data de validade inválida/i],
  ])('impede o envio quando %s é alterada para %s', async (label, invalidDate, message) => {
    const onCreate = vi.fn(() => HttpResponse.json({ id: 102 }, { status: 201 }));
    server.use(http.post(API_URL, onCreate));

    render(<FormQuimicos />);
    fillForm();
    const field = screen.getByRole('textbox', { name: label });
    fireEvent.change(field, { target: { value: invalidDate } });
    submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(field).toHaveAccessibleDescription(message);
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveFocus();
    expect(field).toHaveValue(invalidDate);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('aplica o erro de grupo da API no seletor e preserva o preenchimento', async () => {
    server.use(
      http.post(API_URL, () =>
        HttpResponse.json({ errors: { grupo: [SENTINEL] } }, { status: 400 })
      )
    );

    render(<FormQuimicos />);
    await fillForm();
    submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Verifique este campo.'
    );
    expect(screen.getByLabelText('Grupo')).toHaveValue('Acido');
    await expectFailureToast('Os dados informados precisam de revisão.');
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
    expect(sessionStorage.getItem('auth:session-context')).toContain('42');
    expect(window.location.pathname).toBe('/admin/insert');
    expect(screen.getByLabelText(/^Nome/)).toHaveValue('Ácido de teste');
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeEnabled();
  });
});
