import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RegisteredUsers from './RegisteredUsers';

const usersApi = vi.hoisted(() => ({
  getRegisteredUsers: vi.fn(),
  getUserById: vi.fn(),
}));
const classApi = vi.hoisted(() => ({ getDependentesForApproval: vi.fn() }));
const excel = vi.hoisted(() => ({
  addRow: vi.fn(),
  writeBuffer: vi.fn(),
  worksheet: { columns: [] as unknown[], addRow: vi.fn(), xlsx: undefined },
}));
const saveAs = vi.hoisted(() => vi.fn());

vi.mock('@/integration/Users', () => usersApi);
vi.mock('@/integration/Class', () => classApi);
vi.mock('js-cookie', () => ({ default: { get: () => '4242' } }));
vi.mock('@/components/global/OpenSearch', () => ({ default: () => null }));
vi.mock('@/components/screens/FollowUp', () => ({ default: () => null }));
vi.mock('@/components/screens/ButtonLinkNotify', () => ({ default: () => null }));
vi.mock('@/components/global/inputs/SelectInput', () => ({
  default: ({ options, onValueChange }: { options: { value: string; label: string }[]; onValueChange: (value: string) => void }) => (
    <select aria-label='Filtrar usuários' onChange={(event) => onValueChange(event.target.value)}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  ),
}));
vi.mock('@/components/global/UserStatusManager', () => ({
  default: ({ currentStatus, userName, onStatusUpdate }: { currentStatus: string; userName: string; onStatusUpdate?: (status: string) => void }) => (
    <select
      aria-label={`Status de ${userName}`}
      value={currentStatus}
      onChange={(event) => onStatusUpdate?.(event.target.value)}
    >
      <option>Habilitado</option>
      <option>Desabilitado</option>
    </select>
  ),
}));
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@react-pdf/renderer', () => ({
  PDFDownloadLink: ({ children, fileName }: { children: React.ReactNode; fileName: string }) => (
    <a href='/relatorio.pdf' download={fileName}>{children}</a>
  ),
}));
vi.mock('@/components/pdf/MyDocument', () => ({ MyDocument: () => null }));
vi.mock('exceljs', () => ({
  default: {
    Workbook: class {
      xlsx = { writeBuffer: excel.writeBuffer };
      addWorksheet() {
        return excel.worksheet;
      }
    },
  },
}));
vi.mock('file-saver', () => ({ saveAs }));

const users = [
  { id: 11, nomeCompleto: 'Ana Silva', dataIngresso: '2026-09-01', nivelUsuario: 'Administrador', tipoUsuario: 'Comum', status: 'Habilitado' },
  { id: 22, nomeCompleto: 'Bruno Souza', dataIngresso: '2026-09-02', nivelUsuario: 'Mentor', tipoUsuario: 'Academico', status: 'Desabilitado' },
  { id: 33, nomeCompleto: 'Carla Lima', dataIngresso: '2026-09-03', nivelUsuario: 'Mentorado', tipoUsuario: 'Academico', status: 'Habilitado' },
];

function renderPage() {
  return render(<MemoryRouter><RegisteredUsers /></MemoryRouter>);
}

describe('usuarios cadastrados responsivos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    excel.worksheet.columns = [];
    excel.worksheet.addRow = excel.addRow;
    excel.writeBuffer.mockResolvedValue(new ArrayBuffer(8));
    usersApi.getRegisteredUsers.mockResolvedValue(users);
    usersApi.getUserById.mockResolvedValue({ nomeCompleto: 'Gestora', nivelUsuario: 'Administrador' });
    classApi.getDependentesForApproval.mockResolvedValue([]);
  });

  it('mantem perfis e renderiza todas as linhas com rotulos responsivos', async () => {
    renderPage();

    const list = await screen.findByRole('list', { name: 'Usuários cadastrados' });
    const records = Array.from(list.querySelectorAll('[role="listitem"]'));
    expect(records).toHaveLength(3);
    expect(Array.from(records[0].querySelectorAll('dt')).map((node) => node.textContent)).toEqual([
      'Data de ingresso', 'Nome', 'Tipo de usuário', 'Status',
    ]);
    expect(records[0]).toHaveTextContent('Administrador');
    expect(records[1]).toHaveTextContent('Mentor');
    expect(records[2]).toHaveTextContent('Mentorado');
    expect(screen.getByRole('link', { name: 'Abrir Ana Silva' })).toHaveAttribute('href', '/admin/view-class');
    expect(screen.getByRole('link', { name: 'Abrir Bruno Souza' })).toHaveAttribute('href', '/admin/view-class-mentor');
    expect(screen.getByRole('link', { name: 'Abrir Carla Lima' })).toHaveAttribute('href', '/admin/history/mentoring');
  });

  it('preserva a alteração local de status sem consultar novamente', async () => {
    renderPage();
    const status = await screen.findByRole('combobox', { name: 'Status de Bruno Souza' });

    fireEvent.change(status, { target: { value: 'Habilitado' } });

    expect(status).toHaveValue('Habilitado');
    expect(usersApi.getRegisteredUsers).toHaveBeenCalledTimes(1);
  });

  it('mantém exportações com cinco colunas independentes das quatro colunas visuais', async () => {
    renderPage();
    await screen.findByText('Ana Silva');

    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    await waitFor(() => expect(saveAs).toHaveBeenCalledOnce());
    expect(excel.worksheet.columns).toHaveLength(5);
    expect(excel.addRow).toHaveBeenCalledTimes(3);
    expect(excel.addRow).toHaveBeenCalledWith(expect.objectContaining({
      nomeCompleto: 'Ana Silva', nivelUsuario: 'Administrador', id: 11,
    }));
    expect(screen.getByRole('link', { name: 'PDF' })).toHaveAttribute('download', 'usuarios_cadastrados.pdf');
  });
});
