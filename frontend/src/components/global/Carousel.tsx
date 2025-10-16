import { useState, useEffect, useCallback } from 'react';

interface ICarousel {
  informacoes: string[];
  imageSrc: string[];
}

function Carousel({ informacoes, imageSrc }: ICarousel) {
  const [currentIndex, setCurrentIndex] = useState(1);
  const totalItems = informacoes.length;

  const getCircularIndex = (index: number) => {
    return (index + totalItems) % totalItems;
  };

  const goToNextIndex = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % totalItems);
  }, [totalItems]);

  useEffect(() => {
    const interval = setInterval(goToNextIndex, 5000);

    // Limpa o intervalo e reinicia quando currentIndex muda
    return () => clearInterval(interval);
  }, [goToNextIndex]); // Agora goToNextIndex é a dependência

  return (
    <div className='w-full h-full flex items-center'>
      <div className=' w-full h-full flex flex-wrap lg:flex-nowrap items-center justify-center gap-5 landscape:gap-2 lg:gap-2 '>
        {Array.from({ length: 4 }, (_, i) => {
          const itemIndex = getCircularIndex(currentIndex + i - 1);
          // const scaleClass = i === 1 ? 'scale-110' : 'scale-100';

          return (
            <div
              key={itemIndex}
              className={`w-[40%] h-[45%] lg:w-[20%] lg:h-[40%] landscape:h-[40%] landscape:lg:h-[80%] landscape:md:flex items-center justify-center transition-transform bg-cl-table shadow-sm`}
            >
              <div className=' w-full h-full lg:h-[80%] rounded-md flex flex-col xl:flex-row items-center justify-center border border-borderMy hover:bg-cl-table-item transition-all ease-in-out duration-200 gap-x-2 text-clt-2'>
                <img
                  alt='Imagem descritiva da informação'
                  src={imageSrc[itemIndex]}
                  className='w-3/12 h-auto landscape:w-2/12 landscape:md:w-4/12 landscape:lg:w-3/12 md:w-3/12 lg:w-3/12 m-1'
                ></img>
                <div className='w-full h-[40%] lg:w-7/12 flex items-center justify-center text-center py-2'>
                  <p className='font-rajdhani-medium text-xs md:text-base xl:text-lg text-clt-1 text-wrap landscape:md:text-md p-2'>
                    {informacoes[itemIndex]}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Carousel;