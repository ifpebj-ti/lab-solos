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
    const interval = setInterval(goToNextIndex, 3000);

    // Limpa o intervalo e reinicia quando currentIndex muda
    return () => clearInterval(interval);
  }, [goToNextIndex]); // Agora goToNextIndex é a dependência

  return (
    <div className='flex flex-col items-center w-full'>
      <div className='flex items-center justify-between w-full'>
        {Array.from({ length: 3 }, (_, i) => {
          const itemIndex = getCircularIndex(currentIndex + i - 1);
          const scaleClass = i === 1 ? 'scale-110' : 'scale-100';

          return (
            <div
              key={itemIndex}
              className={`flex items-center justify-center transition-transform ${scaleClass} bg-cl-table shadow-sm`}
              style={{
                width: i === 1 ? '30%' : '25%',
                height: i === 1 ? '160px' : '155px',
              }}
            >
              <div className='rounded-md flex items-center justify-center w-full h-full border border-borderMy hover:bg-cl-table-item transition-all ease-in-out duration-200 gap-x-4 text-clt-2'>
                <img
                  alt='Imagem descritiva da informção'
                  src={imageSrc[itemIndex]}
                  className='w-4/12'
                ></img>
                <div className='w-5/12'>
                  <p className='font-rajdhani-medium text-xl text-clt-1 text-wrap'>
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
