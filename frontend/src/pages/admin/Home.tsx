import Laboratory from '../../../public/images/laboratory.png';
import InfoCard from '@/components/screens/InfoCard';
import AlertIcon from '../../../public/icons/AlertIcon';
import JoinIcon from '../../../public/icons/JoinIcon';
import LoanIcon from '../../../public/icons/LoanIcon';
import Cookie from 'js-cookie';
import { useEffect, useState } from 'react';
import { getDependentesForApproval } from '@/integration/Class';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import { IEmprestimo } from './LoansRequest';
import { getAllLoans } from '@/integration/Loans';
import { getAlertProducts } from '@/integration/Product';
import { PackageSearch, Users, ArrowLeftRight } from 'lucide-react';
export interface IUsuario {
  id: number;
  nomeCompleto: string;
  email: string;
  telefone: string;
  dataIngresso: string; // Pode ser convertido para Date se necessário
  status: string; // Se houver status fixos
  nivelUsuario: 'Mentor' | 'Mentorado' | 'Administrador'; // Ajuste conforme necessário
  cidade: string;
  curso: string;
  instituicao: string;
}

interface IProduto {
  id: number;
  nomeProduto: string;
  tipoProduto: string;
  fornecedor: string;
  quantidade: number;
  quantidadeMinima: number;
  localizacaoProduto: string;
  dataFabricacao: string | Date | null;
  dataValidade: string | null;
  status: string;
}

function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const id = Cookie.get('rankID')!;
  const [approval, setApproval] = useState<IUsuario[]>([]);
  const [loan, setLoan] = useState<IEmprestimo[]>([]);
  const [alert, setAlert] = useState<IProduto[]>([]);

  useEffect(() => {
    const fetchGetLoansDependentes = async () => {
      setIsLoading(true);
      try {
        const response = await getDependentesForApproval(id);
        const responseAllLoans = await getAllLoans();
        const filteredLoans = responseAllLoans.filter(
          (loan: { status: string }) => loan.status === 'Pendente'
        );
        const responseAlert = await getAlertProducts();
        setAlert(responseAlert);
        setLoan(filteredLoans);
        setApproval(response);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar dados de empréstimos:', error);
        }
        setApproval([]);
        setLoan([]);
        setAlert([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGetLoansDependentes();
  }, [id]);

  // Cards principais e de navegação rápida, todos no mesmo padrão
  // Para mudar o tamanho dos ícones, adicione a propriedade "width" e/ou "height" nos componentes SVG.
  // Exemplo: <AlertIcon fill='#16A34A' width={32} height={32} />
  // Ajuste os valores conforme desejado.

  const iconSize = 35;
  const stroke = 1.3;

  const infoCards = [
    {
      icon: <AlertIcon />,
      text: 'Produtos com Alerta',
      notify: alert.length !== 0,
      link: '/admin/follow-up',
      quant: alert.length,
    },
    {
      icon: <JoinIcon />,
      text: 'Solicitações de Cadastro',
      notify: approval.length !== 0,
      link: '/admin/register-request',
      quant: approval.length,
    },
    {
      icon: <LoanIcon />,
      text: 'Solicitações de Empréstimo',
      notify: loan.length !== 0,
      link: '/admin/loans-request',
      quant: loan.length,
    },
    {
      icon: (
        <PackageSearch
          className='text-green-600'
          size={iconSize}
          strokeWidth={stroke}
        />
      ),
      text: 'Produtos',
      notify: false,
      link: '/admin/search-material',
      quant: undefined,
    },
    {
      icon: (
        <Users
          className='text-green-600'
          size={iconSize}
          strokeWidth={stroke}
        />
      ),
      text: 'Usuários',
      notify: false,
      link: '/admin/users',
      quant: undefined,
    },
    {
      icon: (
        <ArrowLeftRight
          className='text-green-600'
          size={iconSize}
          strokeWidth={stroke}
        />
      ),
      text: 'Empréstimos',
      notify: false,
      link: '/admin/all-loans',
      quant: undefined,
    },
  ];

  return (
    <>
      {isLoading ? (
        <div className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2 bg-backgroundMy'>
          <div className='animate-spin'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : (
        <div className='h-full max-h-screen w-full flex justify-start items-center flex-col bg-backgroundMy mb-20'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Home
            </h1>
          </div>
          <div className='w-11/12 h-[50%] flex items-center justify-between mt-6'>
            <div className='flex justify-center flex-col h-full font-rajdhani-semibold text-4xl lg:text-5xl  text-clt-2 gap-y-3'>
              <p>Bem-vindo(a) ao</p>
              <p>
                Laboratório de <span className='text-primaryMy'>Solos</span>
              </p>
              <p className='text-primaryMy'>e Sustentabilidade</p>
              <p>
                <span className='text-primaryMy'> Ambiental </span>- IFPEBJ
              </p>
            </div>
            <div className='h-full'>
              <img
                src={Laboratory}
                alt='Foto ilustrativa de um laboratório'
                className='h-full w-auto'
              ></img>
            </div>
          </div>
          <div className='w-11/12 flex flex-wrap gap-6 justify-between mt-14'>
            {infoCards.map((card) => (
              <InfoCard
                key={card.text}
                icon={card.icon}
                text={card.text}
                notify={card.notify}
                link={card.link}
                quant={card.quant}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
export default Home;
