import LoadingIcon from '../../../public/icons/LoadingIcon';
import OpenSearch from '@/components/global/OpenSearch';
import { useEffect, useState } from 'react';
import FollowUpCard from '@/components/screens/FollowUp';
import LayersIcon from '../../../public/icons/LayersIcon';
import InfoContainer from '@/components/screens/InfoContainer';
import { getUserById } from '@/integration/Users';
import Cookie from 'js-cookie';
import { displayUserValue, formatCivilDate } from '@/function/date';
import { getLoansByUserId } from '@/integration/Loans';
import ButtonLogout from '@/components/global/ButtonLogout';
import { academicoSchema, type Academico } from '@/contracts/user';

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

function ProfileMentee() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Academico>();
  const id = Cookie.get('rankID')!;
  const [loans, setLoans] = useState<IEmprestimo[]>([]);

  useEffect(() => {
    const fetchGetUserById = async () => {
      try {
        const response = await getUserById({ id });
        const academicResult = academicoSchema.safeParse(response);
        setUser(academicResult.success ? academicResult.data : undefined);

        // Tentar buscar empréstimos, mas tratar 404 como caso normal (sem empréstimos)
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
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar usuários', error);
        }
        setUser(undefined);
        setLoans([]);
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

  const infoItemsProf = [
    {
      title: 'Nome do Responsável',
      value: displayUserValue(user?.responsavel?.nomeCompleto),
      width: '30%',
    },
    {
      title: 'Email',
      value: displayUserValue(user?.responsavel?.email),
      width: '30%',
    },
    {
      title: 'Telefone',
      value: displayUserValue(user?.responsavel?.telefone),
      width: '20%',
    },
    {
      title: 'Status',
      value: displayUserValue(user?.responsavel?.status),
      width: '20%',
    },
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
              <ButtonLogout />
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 mt-7'>
            <div className='flex gap-x-5 h-32'>
              <FollowUpCard
                title='Empréstimos Realizados'
                number={String(loans.length)}
                icon={<LayersIcon />}
              />
              <FollowUpCard
                title='Itens Utilizados'
                number={String(totalItens)}
                icon={<LayersIcon />}
              />
            </div>
            <div className='w-full mt-7'>
              <InfoContainer items={infoItems} />
              <div className='w-full flex gap-x-8 mt-5'>
                <InfoContainer items={infoItems2} />
                <InfoContainer items={infoItems3} />
                <InfoContainer items={infoItems4} />
                <InfoContainer items={infoItems5} />
              </div>
              <div className='w-full mt-5'>
                <InfoContainer items={infoItemsProf} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProfileMentee;
