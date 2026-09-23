import OpenSearch from '@/components/global/OpenSearch';
import { useEffect, useState } from 'react';
import FollowUpCard from '@/components/screens/FollowUp';
import InfoContainer from '@/components/screens/InfoContainer';
import { Link } from 'react-router-dom';
import { getUserById } from '@/integration/Users';
import Cookie from 'js-cookie';
import { displayUserValue, formatCivilDate } from '@/function/date';
import { getLoansByUserId } from '@/integration/Loans';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import LayersIcon from '../../../public/icons/LayersIcon';
import ButtonLogout from '@/components/global/ButtonLogout';
import { academicoSchema, type Academico } from '@/contracts/user';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { OPERATION_IDS, type OperationId } from '@/errors/errorCatalog';

export interface IProduto {
  id: number;
  nomeProduto: string;
  fornecedor: string;
  tipo: string;
  quantidade: number;
  quantidadeMinima: number;
  dataFabricacao: string | null;
  dataValidade: string | null;
  localizacaoProduto: string;
  status: string;
  ultimaModificacao: string;
  loteId: number | null;
  lote: unknown | null; // Use `unknown` para tipo indefinido
  emprestimoId: number;
  emprestimo: unknown | null;
}
export interface IEmprestimo {
  id: number;
  dataRealizacao: string;
  dataDevolucao: string;
  dataAprovacao: string;
  status: string;
  produtos: IProduto[];
  solicitanteId: number;
  solicitante: unknown | null; // Use `unknown` para tipo indefinido
  aprovadorId: number;
  aprovador: unknown | null;
}

function ProfileMentor() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Academico>();
  const id = Cookie.get('rankID')!;
  const [loans, setLoans] = useState<IEmprestimo[]>([]);
  const [loadError, setLoadError] = useState<unknown>();
  const [errorOperationId, setErrorOperationId] = useState<OperationId>(
    OPERATION_IDS.userById
  );
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const fetchGetUserById = async () => {
      setLoading(true);
      setLoadError(undefined);
      setErrorOperationId(OPERATION_IDS.userById);
      try {
        const response = await getUserById({ id });
        const academicResult = academicoSchema.safeParse(response);
        if (!academicResult.success)
          throw new Error('Dados do perfil inválidos.');
        setUser(academicResult.data);

        // Tentar buscar empréstimos, mas tratar 404 como caso normal (sem empréstimos)
        setErrorOperationId(OPERATION_IDS.loansByUser);
        try {
          const responseLoans = await getLoansByUserId({ id });
          setLoans(responseLoans);
        } catch (loansError: unknown) {
          // Se for 404, significa que o usuário não tem empréstimos (caso normal)
          const error = loansError as { response?: { status?: number } };
          if (error?.response?.status === 404) {
            setLoans([]); // Define array vazio para usuário sem empréstimos
          } else {
            // Para outros erros, re-lança a exceção
            throw loansError;
          }
        }
      } catch (error) {
        setLoadError(error);
        setUser(undefined);
        setLoans([]);
      } finally {
        setLoading(false);
      }
    };
    fetchGetUserById();
  }, [id, retryToken]);

  const infoItems = [
    {
      title: 'Nome',
      value: displayUserValue(user?.nomeCompleto),
      width: '30%',
    },
    {
      title: 'Email',
      value: displayUserValue(user?.email),
      width: '30%',
    },
    {
      title: 'Instituição',
      value: displayUserValue(user?.instituicao),
      width: '20%',
    },
    { title: 'Status', value: displayUserValue(user?.status), width: '20%' },
  ];
  const infoItems2 = [
    { title: 'Cidade', value: displayUserValue(user?.cidade), width: '100%' },
  ];
  const infoItems3 = [
    {
      title: 'Telefone',
      value: displayUserValue(user?.telefone),
      width: '100%',
    },
  ];
  const infoItems4 = [
    {
      title: 'Data de Ingresso',
      value: formatCivilDate(user?.dataIngresso),
      width: '100%',
    },
  ];
  const infoItems5 = [
    { title: 'Curso', value: displayUserValue(user?.curso), width: '100%' },
  ];

  // Função para calcular o número total de itens utilizados
  const calcularItensEmprestados = (emprestimos: IEmprestimo[]): number => {
    return emprestimos.reduce((total, emprestimo) => {
      const produtosEmprestados = emprestimo.produtos?.length || 0; // Conta o número de produtos
      return total + produtosEmprestados;
    }, 0);
  };
  const totalItens = calcularItensEmprestados(loans);

  return (
    <>
      {loading ? (
        <main className='flex min-h-svh w-full items-center justify-center gap-4 bg-canvas px-4 font-inter-medium text-clt-2'>
          <div className='animate-spin'>
            <LoadingIcon />
          </div>
          Carregando...
        </main>
      ) : (
        <main className='flex min-h-svh w-full flex-col items-center overflow-y-auto bg-canvas pb-9'>
          <div className='mt-7 flex w-[min(92%,72rem)] flex-wrap items-center justify-between gap-4'>
            <h1 className='font-rajdhani-medium text-2xl uppercase text-clt-2 sm:text-3xl'>
              Perfil
            </h1>
            <div className='flex items-center justify-between gap-x-4'>
              <Link
                to={'/mentor/my-class'}
                className='mr-1 flex min-h-11 items-center justify-center rounded-md border border-borderMy px-5 font-inter-regular transition-colors hover:bg-surface-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:mr-5 sm:px-7'
              >
                Minha Turma
              </Link>
              <ButtonLogout />
              <OpenSearch />
            </div>
          </div>
          <div className='mt-7 w-[min(92%,72rem)]'>
            {loadError ? (
              <div className='mb-5 w-full'>
                <ErrorFeedback
                  error={loadError}
                  operationId={errorOperationId}
                  onRetry={() => setRetryToken((token) => token + 1)}
                />
              </div>
            ) : null}
            {user ? (
              <>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <FollowUpCard
                    title='Empréstimos Realizados'
                    number={String(loans.length)}
                    icon={<LayersIcon />}
                    className='md:w-full'
                  />
                  <FollowUpCard
                    title='Itens Utilizados'
                    number={String(totalItens)}
                    icon={<LayersIcon />}
                    className='md:w-full'
                  />
                </div>
                <div className='mt-7 w-full'>
                  <InfoContainer items={infoItems} className='lg:w-full' />
                  <div className='mt-5 grid w-full gap-4 sm:grid-cols-2'>
                    <InfoContainer items={infoItems2} className='lg:w-full' />
                    <InfoContainer items={infoItems3} className='lg:w-full' />
                    <InfoContainer items={infoItems4} className='lg:w-full' />
                    <InfoContainer items={infoItems5} className='lg:w-full' />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </main>
      )}
    </>
  );
}

export default ProfileMentor;
