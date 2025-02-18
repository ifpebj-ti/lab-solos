import Laboratory from '../../public/images/laboratory.png';
import Carousel from '../components/global/Carousel';
import analysis from '../../public/images/analysis.png';
import notebook from '../../public/images/notebook.png';
import vidraria from '../../public/images/vidraria.png';
import logo from '../../public/images/logo.png';
import OpenSearch from '@/components/global/OpenSearch';
import { useEffect, useState } from 'react';
import LoadingIcon from '../../public/icons/LoadingIcon';
import { getSystemQuantities } from '@/integration/System';
interface DashboardData {
  produtos: {
    Quimico: number;
    Vidraria: number;
    Outro: number;
    Total: number;
  };
  alertas: {
    ProdutosVencidos: number;
    ProdutosEmBaixa: number;
  };
  usuarios: {
    Administrador: number;
    Mentor: number;
    Mentorado: number;
    Total: number;
  };
  emprestimos: {
    Aprovado: number;
    Pendente: number;
    Rejeitado: number;
    Total: number;
  };
  totalProdutosEmprestados: number;
}
function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [system, setSystem] = useState<DashboardData>();
  useEffect(() => {
    const fetchGetSystem = async () => {
      setIsLoading(true);
      try {
        const systemQuant = await getSystemQuantities();
        setSystem(systemQuant);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erro ao buscar dados de empréstimos:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchGetSystem();
  }, []);
  const valor = [
    String(system?.emprestimos.Total),
    String(system?.produtos.Total),
    String(system?.emprestimos.Aprovado),
    String(system?.usuarios.Total),
    String(system?.totalProdutosEmprestados),
  ];
  const informacoes = [
    'Solicitações de Empréstimo',
    'Itens Monitorados',
    'Empréstimos Realizados',
    'Usuários Cadatrados',
    'Solicitações de Itens',
  ];
  const imagesSrc = [analysis, notebook, vidraria, notebook, vidraria];
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
        <div className='h-full w-full flex justify-start items-center flex-col overflow-y-auto bg-backgroundMy'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Home
            </h1>
            <div className='flex items-center justify-between'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 h-[50%] flex items-center justify-between mt-6'>
            <div className='flex justify-center flex-col h-full font-rajdhani-semibold text-4xl lg:text-5xl xl:text-6xl text-clt-2 gap-y-3'>
              <p>
                Laboratório de <span className='text-primaryMy'>Solos</span>
              </p>
              <p>e Sustentabilidade</p>
              <p>
                Ambiental - <span className='text-primaryMy'>IFPEBJ</span>
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
          <div className='w-11/12'>
            <Carousel
              valor={valor}
              informacoes={informacoes}
              imageSrc={imagesSrc}
            />
          </div>
          <div className='w-5/12 h-2 bg-primaryMy rounded-lg text-backgroundMy'>
            .
          </div>
          <div className='w-full min-h-44 bg-primaryMy mt-16 flex items-center justify-center'>
            <div className='w-11/12 flex items-center justify-between h-full text-white'>
              <div className='flex items-center justify-center'>
                <img src={logo} alt='Logo' className='w-36' />
                <div className='flex-col mt-2'>
                  <p className='text-4xl font-rajdhani-semibold'>Lab-On</p>
                  <p className='font-rajdhani-medium text-base'>
                    Gerenciamento de Laboratórios Químicos Online
                  </p>
                  <div className='flex space-x-1 font-rajdhani-medium text-base'>
                    <a
                      href='mailto:jessica.roberta@gmail.com'
                      className='hover:underline hover:text-blue-600 cursor-pointer'
                    >
                      Jessica Roberta
                    </a>
                    ,&nbsp;
                    <a
                      href='mailto:ricardo.espindola@gmail.com'
                      className='hover:underline hover:text-blue-600 cursor-pointer'
                    >
                      Ricardo Espíndola
                    </a>
                    &nbsp; e&nbsp;
                    <a
                      href='mailto:ricardoespindola128@gmail.com'
                      className='hover:underline hover:text-blue-600 cursor-pointer'
                    >
                      Tomás Abdias
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Home;
