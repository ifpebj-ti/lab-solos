import Carousel from '../components/global/Carousel';
import analysis from '../../public/images/analysis.png';
import notebook from '../../public/images/notebook.png';
import vidraria from '../../public/images/vidraria.png';
import OpenSearch from '@/components/global/OpenSearch';
import { useState } from 'react';
import LoadingIcon from '../../public/icons/LoadingIcon';

function Home() {
  const [isLoading] = useState(false);

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
        <div className='w-full h-screen flex justify-start items-center flex-col overflow-y-auto bg-backgroundMy gap-1'>

          <div className='w-11/12 flex items-center justify-between h-[10%] mt-2'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Home
            </h1>
            <div className='flex items-center justify-between'>
              <OpenSearch />
            </div>
          </div>

          <div className='w-full h-[80%] flex flex-col landscape:md:flex-row landscape:lg:flex-col items-center justify-around mt-2'>
            <div className='w-full h-[35%] lg:h-[40%] landscape:md:w-full landscape:md:h-full flex items-center justify-between py-2 px-5'>
              <div className='w-full h-full flex justify-center flex-col font-rajdhani-semibold text-4xl md:text-5xl lg:text-6xl landscape:text-2xl md:landscape:text-lg lg:landscape:text-4xl text-clt-2 gap-y-3 lg:bg-[url(../../public/images/laboratory.png)]  bg-no-repeat bg-center lg:bg-right-bottom bg-contain '>
                <div className='w-full h-full md:w-11/12 landscape:md:w-[80%] landscape:lg:w-[60%] landscape:md:text-3xl landscape:lg:text-5xl flex items-center justify-center  bg-backgroundMy/80 lg:bg-transparent p-5 lg:p-0'>
                  <p>Bem-vindo(a) ao Laboratório de
                    <span className='text-primaryMy'> Solos e</span>
                    <span className='text-primaryMy'> Sustentabilidade </span>
                    Ambiental -
                    <span className='text-primaryMy'> IFPEBJ</span>
                  </p>
                </div>
              </div>
            </div>

            <div className='w-full h-[35%] lg:h-[40%] landscape:md:h-full flex flex-col items-center justify-center px-2'>
              <Carousel informacoes={informacoes} imageSrc={imagesSrc} />
            </div>
          </div>

        </div>
      )}
    </>
  );
}

export default Home;
