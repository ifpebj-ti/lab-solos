import Laboratory from '../../public/images/laboratory.png';
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
        <div className='h-full w-full flex justify-start items-center flex-col overflow-y-auto bg-backgroundMy'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Home
            </h1>
            <div className='flex items-center justify-between'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 h-[45%] flex items-center justify-between mt-6'>
            <div className='flex justify-center flex-col h-full font-rajdhani-semibold text-4xl lg:text-5xl text-clt-2 gap-y-3'>
              <p>Bem-vindo(a) ao</p>
              <p>
                Laboratório de <span className='text-primaryMy'>Solos</span>
              </p>
              <p className='text-primaryMy'>e Sustentabilidade</p>
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
          <div className='w-11/12 mt-10'>
            <Carousel informacoes={informacoes} imageSrc={imagesSrc} />
          </div>
        </div>
      )}
    </>
  );
}

export default Home;
