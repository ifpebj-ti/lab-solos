import LoadingIcon from '../../public/icons/LoadingIcon';
import OpenSearch from '@/components/global/OpenSearch';
import { useEffect, useState } from 'react';
import InfoContainer from '@/components/screens/InfoContainer';
import { getUserById } from '@/integration/Users';
import Cookie from 'js-cookie';
import { displayUserValue, formatCivilDate } from '@/function/date';
import { FileSpreadsheet, MessageSquare, AlertTriangle } from 'lucide-react';
import CardFunction from '@/components/screens/CardFunction';
import { verificarEmprestimosVencidos } from '@/integration/Notifications';
import { toast } from '@/components/hooks/use-toast';
import type { Academico, Usuario } from '@/contracts/user';

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
      try {
        const response = await getUserById({ id });
        setUser(response);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar usuários', error);
        }
        setUser(undefined);
      } finally {
        setLoading(false);
      }
    };
    fetchGetUserById();
  }, [id]);

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
    {
      title: 'Curso',
      value: displayUserValue(user && 'curso' in user ? user.curso : null),
      width: '100%',
    },
  ];

  return (
    <>
      {loading ? (
        <div className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2 bg-backgroundMy'>
          <div className='animate-spin'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : (
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy pb-9'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Perfil
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 mt-7'>
            <div className='w-full'>
              <InfoContainer items={infoItems} />
              <div className='w-full flex gap-x-8 mt-5'>
                <InfoContainer items={infoItems2} />
                <InfoContainer items={infoItems3} />
                <InfoContainer items={infoItems4} />
                <InfoContainer items={infoItems5} />
              </div>
            </div>
          </div>
          <div className='w-11/12 min-h-3 mt-9 border-t border-borderMy py-4 pt-6'>
            <p className='font-rajdhani-medium text-clt-2 text-3xl'>
              Funcionalidades
            </p>
            <div className='w-full min-h-6 flex flex-wrap items-start justify-start gap-10 mt-7'>
              <CardFunction
                link='/admin/view-info'
                text='Comunicação InterLab'
                icon={<MessageSquare stroke='#16a34a' width={35} height={35} />}
                notify={true}
              />
              <CardFunction
                link='/admin/view-info'
                text='Importar Planilha de Cadastro de Bens'
                icon={
                  <FileSpreadsheet stroke='#16a34a' width={35} height={35} />
                }
                notify={false}
              />
              <div
                onClick={handleVerificarEmprestimosVencidos}
                className='cursor-pointer'
              >
                <CardFunction
                  link='#'
                  text={
                    verificandoEmprestimos
                      ? 'Verificando...'
                      : 'Verificar Empréstimos Vencidos'
                  }
                  icon={
                    <AlertTriangle stroke='#dc2626' width={35} height={35} />
                  }
                  notify={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Profile;
