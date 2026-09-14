import OpenSearch from '@/components/global/OpenSearch';

function Home() {
  return (
    <div className='w-full h-screen flex justify-start items-center flex-col overflow-y-auto bg-backgroundMy gap-1'>
      <div className='w-full h-[10%] flex items-center justify-between mt-2 px-10'>
        <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
          Home
        </h1>
        <div className='flex items-center justify-between'>
          <OpenSearch />
        </div>
      </div>

      <div className='w-full flex-1 flex items-center justify-center mt-2 px-10'>
        <div className='w-full h-full flex items-center justify-between py-2'>
          <div className='w-full h-full flex justify-center flex-col font-rajdhani-semibold text-4xl md:text-5xl lg:text-6xl landscape:text-2xl md:landscape:text-lg lg:landscape:text-4xl text-clt-2 gap-y-3 lg:bg-[url(../../public/images/laboratory.png)] bg-no-repeat bg-center lg:bg-right-bottom bg-contain'>
            <div className='w-full h-full md:w-11/12 landscape:md:w-[80%] landscape:lg:w-[60%] landscape:md:text-3xl landscape:lg:text-4xl flex items-center justify-center bg-backgroundMy/80 lg:bg-transparent p-0'>
              <p>
                Bem-vindo(a) ao Laboratório de
                <span className='text-primaryMy'> Solos e</span>
                <span className='text-primaryMy'> Sustentabilidade </span>
                Ambiental -<span className='text-primaryMy'> IFPEBJ</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
