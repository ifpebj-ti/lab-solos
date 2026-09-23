import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../public/icons/LoadingIcon';
import FollowUpCard from '@/components/screens/FollowUp';
import UsersIcon from '../../public/icons/UsersIcon';
import UserIcon from '../../public/icons/UserIcon';
import SearchInput from '@/components/global/inputs/SearchInput';
import TopDown from '@/components/global/table/TopDown';
import SelectInput from '@/components/global/inputs/SelectInput';
import HeaderTable from '@/components/global/table/Header';
import Pagination from '@/components/global/table/Pagination';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRegisteredUsers, getUserById } from '@/integration/Users';
import { formatCivilDate } from '../function/date';
import { FileText } from 'lucide-react';
import TableItemWithActions from '@/components/global/table/TableItemWithActions';
import UserActionsMenu from '@/components/global/UserActionsMenu';
import ButtonLinkNotify from '@/components/screens/ButtonLinkNotify';
import { getDependentesForApproval } from '@/integration/Class';
import Cookie from 'js-cookie';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { statusUsuarioSchema } from '@/contracts/user';
import type { Dependente, Usuario } from '@/contracts/user';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { notifyError } from '@/errors/presentError';
import {
  ResponsiveTable,
  type ResponsiveColumn,
} from '@/components/global/table/ResponsiveTable';

const registeredUserColumns: readonly ResponsiveColumn[] = [
  { key: 'joinedAt', label: 'Data de ingresso', weight: 2.5 },
  { key: 'name', label: 'Nome', weight: 3.5 },
  { key: 'role', label: 'Tipo de usuário', weight: 2 },
  { key: 'status', label: 'Status', weight: 2 },
];

type RegisteredUser = Pick<
  Usuario,
  | 'id'
  | 'nomeCompleto'
  | 'dataIngresso'
  | 'nivelUsuario'
  | 'tipoUsuario'
  | 'status'
>;

type ReportSigner = Pick<Usuario, 'nomeCompleto' | 'nivelUsuario'>;

function RegisteredUsers() {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const id = Cookie.get('rankID')!;
  const [value, setValue] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [isAscending, setIsAscending] = useState(true); // Novo estado para a ordem
  const [searchTerm, setSearchTerm] = useState('');
  const [approval, setApproval] = useState<Dependente[]>([]);
  const [user, setUser] = useState<ReportSigner>();
  const [registeredUsersError, setRegisteredUsersError] = useState<unknown>();
  const [approvalError, setApprovalError] = useState<unknown>();
  const [userError, setUserError] = useState<unknown>();
  const [isExporting, setIsExporting] = useState(false);
  const columnsExport = [
    { value: 'Nome', width: '40%' },
    { value: 'Nível', width: '15%' },
    { value: 'Ingresso', width: '15%' },
    { value: 'Status', width: '15%' },
    { value: 'ID Responsável', width: '15%' },
  ];
  const columnWidthsExport = ['40%', '15%', '15%', '15%', '15%'];
  const exportToExcel = async () => {
    setIsExporting(true);

    try {
      const [{ default: ExcelJS }, { default: FileSaver }] = await Promise.all([
        import('exceljs'),
        import('file-saver'),
      ]);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Usuários Cadastrados');

      // Definir os cabeçalhos da planilha
      worksheet.columns = [
        { header: 'Nome', key: 'nomeCompleto', width: 30 },
        { header: 'Nível', key: 'nivelUsuario', width: 20 },
        { header: 'Ingresso', key: 'dataIngresso', width: 20 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'ID Responsável', key: 'id', width: 20 },
      ];

      // Adicionar os dados da tabela
      currentData.forEach((user) => {
        worksheet.addRow({
          nomeCompleto: user.nomeCompleto,
          nivelUsuario: user.nivelUsuario,
          dataIngresso: formatCivilDate(user.dataIngresso),
          status: user.status,
          id: user.id,
        });
      });

      // Criar o arquivo Excel
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Baixar o arquivo
      FileSaver.saveAs(blob, 'usuarios.xlsx');
    } catch (error) {
      notifyError(error, OPERATION_IDS.registeredUsers);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPdf = async () => {
    setIsExporting(true);

    try {
      const [{ pdf }, { MyDocument }, { default: FileSaver }] =
        await Promise.all([
          import('@react-pdf/renderer'),
          import('@/components/pdf/MyDocument'),
          import('file-saver'),
        ]);
      const blob = await pdf(
        <MyDocument
          name={user?.nomeCompleto ? user.nomeCompleto : 'NÃ£o encontrado'}
          nivel={user?.nivelUsuario ? user.nivelUsuario : 'NÃ£o encontrado'}
          data={currentData.map((currentUser) => [
            String(currentUser.nomeCompleto),
            String(currentUser.nivelUsuario),
            String(formatCivilDate(currentUser.dataIngresso)),
            String(currentUser.status),
            String(currentUser.id),
          ])}
          title='UsuÃ¡rios Cadastrados'
          columnWidths={columnWidthsExport}
          columns={columnsExport}
          signer={user?.nomeCompleto ? user.nomeCompleto : 'NÃ£o encontrado'}
        />
      ).toBlob();
      FileSaver.saveAs(blob, 'usuarios_cadastrados.pdf');
    } catch (error) {
      notifyError(error, OPERATION_IDS.registeredUsers);
    } finally {
      setIsExporting(false);
    }
  };

  const loadRegisteredUsers = useCallback(async () => {
    setIsLoading(true);
    setRegisteredUsersError(undefined);

    try {
      const processedRegisteredUsers = await getRegisteredUsers();
      setRegisteredUsers(processedRegisteredUsers);
    } catch (error) {
      setRegisteredUsersError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadApproval = useCallback(async () => {
    setApprovalError(undefined);

    try {
      const response = await getDependentesForApproval(id);
      setApproval(response);
    } catch (error) {
      setApprovalError(error);
    }
  }, [id]);

  const loadUser = useCallback(async () => {
    setUserError(undefined);

    try {
      const responseID = await getUserById({ id });
      setUser(responseID);
    } catch (error) {
      setUserError(error);
    }
  }, [id]);

  useEffect(() => {
    void loadRegisteredUsers();
    void loadApproval();
    void loadUser();
  }, [loadApproval, loadRegisteredUsers, loadUser]);

  const options = [
    { value: 'todos', label: 'Todos' }, // Para exibir todos os usuários por padrão
    { value: 'Administrador', label: 'Administradores' },
    { value: 'Mentor', label: 'Mentores' },
    { value: 'Mentorado', label: 'Mentorandos' },
    { value: 'Outro', label: 'Outro Tipo' },
    { value: 'Habilitado', label: 'Status: Habilitado' },
    { value: 'Desabilitado', label: 'Status: Desabilitado' },
  ];

  const filteredUsers = registeredUsers.filter((user) => {
    const matchesSearch = user.nomeCompleto
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    if (value === 'todos') {
      return matchesSearch;
    }

    // Filtrar por status
    if (['Habilitado', 'Desabilitado'].includes(value)) {
      return matchesSearch && user.status === value;
    }

    // Filtrar por nível de usuário
    return matchesSearch && user.nivelUsuario.toString() === value;
  });
  const sortedUsers = isAscending
    ? [...filteredUsers]
    : [...filteredUsers].reverse();

  const currentData = sortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSortOrder = (ascending: boolean) => {
    setIsAscending(ascending);
  };
  const getUserCountText = (userType: string) => {
    const count = registeredUsers.filter(
      (user) => user.nivelUsuario === userType
    ).length;
    return `${count}`;
  };

  const getDestinationRoute = (userType: string) => {
    switch (userType) {
      case 'Administrador':
        return '/admin/view-class';
      case 'Mentor':
        return '/admin/view-class-mentor';
      case 'Mentorado':
        return '/admin/history/mentoring';
      default:
        return '/admin/view-class'; // Rota padrão caso o tipo de usuário não seja reconhecido
    }
  };

  const auxiliaryErrors = (
    <>
      {approvalError ? (
        <ErrorFeedback
          className='mt-4'
          error={approvalError}
          operationId={OPERATION_IDS.dependentsForApproval}
          onRetry={() => void loadApproval()}
          onNavigate={() => navigate('/admin')}
        />
      ) : null}
      {userError ? (
        <ErrorFeedback
          className='mt-4'
          error={userError}
          operationId={OPERATION_IDS.userById}
          onRetry={() => void loadUser()}
          onNavigate={() => navigate('/admin')}
        />
      ) : null}
    </>
  );

  return (
    <main
      id='main-content'
      aria-busy={isLoading}
      className='min-h-svh bg-canvas text-clt-2'
    >
      {isLoading ? (
        <div
          role='status'
          className='flex min-h-svh w-full items-center justify-center gap-x-4 bg-canvas font-inter-medium text-clt-2'
        >
          <div className='h-5 w-5 animate-spin rounded-full border-2 border-primaryMy border-t-transparent'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : registeredUsersError ? (
        <div className='flex min-h-svh w-full items-center justify-center bg-canvas px-4 py-8'>
          <ErrorFeedback
            error={registeredUsersError}
            operationId={OPERATION_IDS.registeredUsers}
            onRetry={() => void loadRegisteredUsers()}
            onNavigate={() => navigate('/admin')}
          />
        </div>
      ) : registeredUsers.length !== 0 ? (
        <div className='mx-auto flex min-h-svh w-full max-w-7xl flex-col overflow-y-auto bg-canvas px-4 pb-12 sm:px-6 lg:px-8'>
          <div className='flex min-w-0 flex-col items-start justify-between gap-4 pt-8 sm:flex-row sm:items-center'>
            <h1 className='min-w-0 break-words uppercase font-rajdhani-medium text-2xl lg:text-3xl text-clt-2'>
              Usuários Cadastrados
            </h1>
            <div className='flex min-w-0 flex-wrap items-center gap-3'>
              <ButtonLinkNotify
                text='Solicitações de Cadastro'
                notify={approval.length != 0 ? true : false}
                quant={approval.length}
                // link='/admin/register-request'
              />
              <OpenSearch />
            </div>
          </div>
          {auxiliaryErrors}
          <div className='flex w-full flex-wrap items-stretch justify-start gap-4 pt-8'>
            <FollowUpCard
              title='Administradores'
              number={getUserCountText('Administrador')}
              icon={<UserIcon />}
            />
            <FollowUpCard
              title='Mentores'
              number={getUserCountText('Mentor')}
              icon={<UserIcon />}
            />
            <FollowUpCard
              title='Mentorandos'
              number={getUserCountText('Mentorado')}
              icon={<UsersIcon />}
            />
          </div>
          <section
            aria-label='Usuários cadastrados'
            className='mt-8 mb-4 flex min-h-96 w-full min-w-0 flex-col items-center rounded-xl border border-borderMy bg-surface p-4 shadow-sm sm:p-6'
          >
            <div className='flex w-full min-w-0 flex-col-reverse items-stretch justify-between gap-4 lg:flex-row lg:items-center'>
              <div className='flex w-full min-w-0 items-start justify-start gap-2 lg:w-2/5'>
                <div className='flex w-full min-w-0 items-center gap-2'>
                  <TopDown
                    onClick={() => toggleSortOrder(!isAscending)}
                    top={isAscending}
                  />
                  <SearchInput
                    name='search'
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    value={searchTerm}
                  />
                </div>
              </div>
              <div className='flex w-full min-w-0 flex-wrap items-center justify-start gap-2 lg:w-2/5 lg:justify-end'>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type='button'
                      aria-label='Opções de exportação'
                      className='border border-borderMy rounded-sm min-h-11 min-w-11 flex items-center justify-center hover:bg-cl-table-item transition-all ease-in-out duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-800 md:min-h-9 md:min-w-9 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11'
                    >
                      <FileText
                        stroke='currentColor'
                        width={21}
                        strokeWidth={1.5}
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto border border-borderMy bg-surface p-2 shadow-lg'>
                    <ul className='w-full flex flex-col items-start gap-y-1'>
                      <li className='flex w-full items-center rounded py-1 px-2 font-inter-regular text-sm hover:bg-surface-selected'>
                        <button
                          type='button'
                          onClick={() => void exportToPdf()}
                          disabled={isExporting}
                          aria-busy={isExporting}
                          className='flex items-center justify-center disabled:cursor-wait disabled:opacity-60'
                          data-document={null}
                          /*
                            <MyDocument
                              name={
                                user?.nomeCompleto
                                  ? user?.nomeCompleto
                                  : 'Não encontrado'
                              }
                              nivel={
                                user?.nivelUsuario
                                  ? user?.nivelUsuario
                                  : 'Não encontrado'
                              }
                              data={currentData.map((user) => [
                                String(user.nomeCompleto),
                                String(user.nivelUsuario),
                                String(formatCivilDate(user.dataIngresso)),
                                String(user.status),
                                String(user.id),
                              ])}
                              title='Usuários Cadastrados'
                              columnWidths={columnWidthsExport}
                              columns={columnsExport}
                              signer={
                                user?.nomeCompleto
                                  ? user?.nomeCompleto
                                  : 'Não encontrado'
                              }
                            />
                          }
                          fileName='usuarios_cadastrados.pdf'
                          */
                        >
                          <FileText
                            stroke='currentColor'
                            width={18}
                            strokeWidth={1.5}
                            className='mr-1 mt-[2px]'
                          />
                          PDF
                        </button>
                      </li>
                      <li className='w-full'>
                        <button
                          type='button'
                          aria-label='Exportar Excel'
                          className='flex min-h-11 w-full cursor-pointer items-center rounded px-2 py-1 font-inter-regular text-sm text-clt-2 hover:bg-surface-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
                          onClick={() => void exportToExcel()}
                          disabled={isExporting}
                        >
                          <FileText
                            stroke='currentColor'
                            width={18}
                            strokeWidth={1.5}
                            className='mr-1 mt-[2px]'
                          />
                          Excel
                        </button>
                      </li>
                    </ul>
                  </PopoverContent>
                </Popover>
                <div className='w-full flex justify-center items-center'>
                  <SelectInput
                    options={options}
                    onValueChange={(value) => {
                      setValue(value);
                      setCurrentPage(1);
                    }}
                    value={value}
                  />
                </div>
              </div>
            </div>

            <div className='mt-4 w-full min-w-0'>
              <ResponsiveTable
                label='Usuários cadastrados'
                columns={registeredUserColumns}
              >
                <HeaderTable />
                <div className='w-full items-center flex flex-col justify-between min-h-72'>
                  <div className='w-full'>
                    {currentData.length === 0 ? (
                      <div className='w-full h-40 flex items-center justify-center font-inter-regular'>
                        Nenhum dado disponível para exibição.
                      </div>
                    ) : (
                      currentData.map((rowData, index) => (
                        <TableItemWithActions
                          key={rowData.id}
                          data={[
                            formatCivilDate(rowData?.dataIngresso),
                            rowData?.nomeCompleto || 'Nome não disponível',
                            rowData?.nivelUsuario,
                            <UserActionsMenu
                              key={`status-${rowData.id}`}
                              userId={Number(rowData.id)}
                              currentStatus={rowData.status}
                              userName={rowData.nomeCompleto}
                              onStatusUpdate={(newStatus) => {
                                const parsedStatus =
                                  statusUsuarioSchema.safeParse(newStatus);

                                if (!parsedStatus.success) {
                                  return;
                                }

                                // Atualizar o estado local para refletir a mudança
                                setRegisteredUsers((prev) =>
                                  prev.map((user) =>
                                    user.id === rowData.id
                                      ? { ...user, status: parsedStatus.data }
                                      : user
                                  )
                                );
                              }}
                            />,
                          ]}
                          rowIndex={index}
                          destinationRoute={getDestinationRoute(
                            rowData?.nivelUsuario
                          )}
                          id={rowData.id}
                          itemLabel={rowData.nomeCompleto}
                        />
                      ))
                    )}
                  </div>
                </div>
              </ResponsiveTable>
            </div>
            <Pagination
              totalItems={registeredUsers.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </section>
        </div>
      ) : (
        <div className='flex min-h-svh w-full flex-col items-center justify-center gap-4 bg-canvas px-4 font-inter-regular text-lg'>
          {auxiliaryErrors}
          <h1 className='uppercase font-rajdhani-medium text-2xl text-clt-2'>
            Usuários Cadastrados
          </h1>
          <p>Nenhum usuário cadastrado.</p>
        </div>
      )}
    </main>
  );
}

export default RegisteredUsers;
