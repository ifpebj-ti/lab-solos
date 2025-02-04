import LoadingIcon from '../../public/icons/LoadingIcon';
import OpenSearch from '@/components/global/OpenSearch';
import { useEffect, useState } from 'react';
import FollowUpCard from '@/components/screens/FollowUp';
import LayersIcon from '../../public/icons/LayersIcon';
import InfoContainer from '@/components/screens/InfoContainer';
import { getUserById } from '@/integration/Users';
import Cookie from 'js-cookie';
import { formatDateTime } from '@/function/date';
import { getLoansByUserId } from '@/integration/Loans';

// Interface para o responsável
export interface IResponsible {
  id: number;
  nomeCompleto: string;
  email: string;
  senhaHash: string;
  telefone: string;
  dataIngresso: string; // Formato ISO
  nivelUsuario: string;
  tipoUsuario: string;
  status: string;
  emprestimosSolicitados: unknown; // Ajuste se necessário, pois não há exemplo de dados
  emprestimosAprovados: unknown; // Ajuste se necessário
  responsavelId: number | null;
  responsavel: IResponsible | null; // Recursivamente permite responsáveis aninhados
  dependentes: (IResponsible | null)[]; // Array de dependentes, pode conter `null`
}

// Interface para o usuário principal
export interface IUser {
  instituicao: string;
  cidade: string;
  curso: string;
  id: number;
  nomeCompleto: string;
  email: string;
  senhaHash: string;
  telefone: string;
  dataIngresso: string; // Formato ISO
  nivelUsuario: string;
  tipoUsuario: string;
  status: string;
  emprestimosSolicitados: unknown; // Ajuste se necessário
  emprestimosAprovados: unknown; // Ajuste se necessário
  responsavelId: number | null;
  responsavel: IResponsible | null; // Referência ao responsável
  dependentes: unknown[]; // Pode ser ajustado para incluir uma interface se necessário
}

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
  const id = Cookie.get('rankID')!;
  const [loans, setLoans] = useState<IEmprestimo[]>([]);

  useEffect(() => {
    const fetchGetUserById = async () => {
      try {
        const response = await getUserById({ id });
        const responseLoans = await getLoansByUserId({ id });
        setLoans(responseLoans);
        setUser(response);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erro ao buscar usuários', error);
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
      value: user?.nomeCompleto ?? '',
      width: '30%',
    },
    {
      title: 'Email',
      value: user?.email ?? '',
      width: '30%',
    },
    { title: 'Instituição', value: user?.instituicao ?? '', width: '20%' },
    { title: 'Status', value: user?.status ?? '', width: '20%' },
  ];
  const infoItems2 = [
    { title: 'Cidade', value: user?.cidade ?? '', width: '100%' },
  ];
  const infoItems3 = [
    {
      title: 'Telefone',
      value: user?.telefone ?? '',
      width: '100%',
    },
  ];
  const infoItems4 = [
    {
      title: 'Data de Ingresso',
      value: formatDateTime(user?.dataIngresso) ?? '',
      width: '100%',
    },
  ];
  const infoItems5 = [
    { title: 'Curso', value: user?.curso ?? '', width: '100%' },
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
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Perfil
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Profile;
