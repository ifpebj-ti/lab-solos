import LoadingIcon from '../../public/icons/LoadingIcon';
import OpenSearch from '@/components/global/OpenSearch';
import { useEffect, useState } from 'react';
import InfoContainer from '@/components/screens/InfoContainer';
import { getUserById } from '@/integration/Users';
import Cookie from 'js-cookie';
import { displayUserValue, formatCivilDate } from '@/function/date';
import { AlertTriangle } from 'lucide-react';
import CardFunction from '@/components/screens/CardFunction';
import { verificarEmprestimosVencidos } from '@/integration/Notifications';
import { toast } from '@/components/hooks/use-toast';
import type { Academico, Usuario } from '@/contracts/user';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { OPERATION_IDS } from '@/errors/errorCatalog';

export type IUser = Usuario | Academico;

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

function Profile() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<IUser>();
  const [verificandoEmprestimos, setVerificandoEmprestimos] = useState(false);
  const [profileError, setProfileError] = useState<unknown>();
  const [retryToken, setRetryToken] = useState(0);
  const id = Cookie.get('rankID')!;

  const handleVerificarEmprestimosVencidos = async () => {
    try {
      setVerificandoEmprestimos(true);
      const response = await verificarEmprestimosVencidos();
      toast({
        title: 'Sucesso',
        description: response.message,
        variant: 'default',
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao verificar empréstimos vencidos. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setVerificandoEmprestimos(false);
    }
  };

  useEffect(() => {
    const fetchGetUserById = async () => {
      setLoading(true);
      setProfileError(undefined);
      try {
        const response = await getUserById({ id });
        setUser(response);
      } catch (error) {
        setProfileError(error);
        setUser(undefined);
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
      title: 'Nivel de Usuário',
      value: displayUserValue(user?.nivelUsuario),
      width: '20%',
    },
    { title: 'Status', value: displayUserValue(user?.status), width: '20%' },
  ];
  const infoItems2 = [
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
    {
      title: 'Curso',
      value: displayUserValue(user && 'curso' in user ? user.curso : null),
      width: '100%',
    },
  ];

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
          <div className='mt-7 flex w-[min(92%,72rem)] items-center justify-between gap-4'>
            <h1 className='font-rajdhani-medium text-2xl uppercase text-clt-2 sm:text-3xl'>
              Perfil
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='mt-7 w-[min(92%,72rem)]'>
            {profileError ? (
              <ErrorFeedback
                error={profileError}
                operationId={OPERATION_IDS.userById}
                onRetry={() => setRetryToken((token) => token + 1)}
              />
            ) : user ? (
              <>
                <div className='grid w-full gap-5'>
                  <InfoContainer
                    items={infoItems}
                    columns={2}
                    className='lg:w-full'
                  />
                  <InfoContainer
                    items={[...infoItems2, ...infoItems4, ...infoItems5]}
                    columns={2}
                    className='lg:w-full'
                  />
                </div>
                <div className='mt-9 min-h-3 w-full border-t border-borderMy py-4 pt-6'>
                  <p className='font-rajdhani-medium text-2xl text-clt-2 sm:text-3xl'>
                    Funcionalidades
                  </p>
                  <div className='mt-7 flex min-h-6 w-full flex-wrap items-start justify-start gap-6'>
                    <div onClick={handleVerificarEmprestimosVencidos}>
                      <CardFunction
                        link='#'
                        text={
                          verificandoEmprestimos
                            ? 'Verificando...'
                            : 'Verificar Empréstimos Vencidos'
                        }
                        icon={
                          <AlertTriangle
                            className='text-danger'
                            width={35}
                            height={35}
                          />
                        }
                        notify={false}
                      />
                    </div>
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

export default Profile;
