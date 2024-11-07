import React, { useState, useEffect, useCallback } from 'react';

interface ICarousel {
  valor: string[];
  informacoes: string[];
  imageSrc: string[];
}

function Carousel({ valor, informacoes, imageSrc }: ICarousel) {
  const [currentIndex, setCurrentIndex] = useState(1);
  const totalItems = valor.length;

  const getCircularIndex = (index: number) => {
    return (index + totalItems) % totalItems;
  };

  const goToNextIndex = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % totalItems);
  }, [totalItems]);

  useEffect(() => {
    const interval = setInterval(goToNextIndex, 6000);

    // Limpa o intervalo e reinicia quando currentIndex muda
    return () => clearInterval(interval);
  }, [goToNextIndex]); // Agora goToNextIndex é a dependência

  const handleCardClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className='flex flex-col items-center w-11/12 mt-14 mb-16'>
      <div className='flex items-center justify-between w-full bg-white'>
        {Array.from({ length: 3 }, (_, i) => {
          const itemIndex = getCircularIndex(currentIndex + i - 1);
          const scaleClass = i === 1 ? 'scale-110' : 'scale-100';

          return (
            <div
              key={itemIndex}
              onClick={() => handleCardClick(itemIndex)} // Atualiza o index ao clicar no card
              className={`flex items-center justify-center transition-transform cursor-pointer ${scaleClass}`}
              style={{
                width: i === 1 ? '30%' : '25%',
                height: i === 1 ? '200px' : '180px',
              }}
            >
              <div className='rounded-md flex items-center justify-center w-full h-full border border-borderMy hover:bg-cl-table-item transition-all ease-in-out duration-200 gap-x-4 text-clt-2'>
                <img
                  alt='Imagem descritiva da informção'
                  src={imageSrc[itemIndex]}
                  className='w-5/12'
                ></img>
                <div className='w-5/12'>
                  <p className='text-5xl font-inter-semibold'>
                    +{valor[itemIndex]}
                  </p>
                  <p className='font-inter-regular text-sm text-clt-2 text-wrap'>
                    {informacoes[itemIndex]}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className='flex space-x-2 mt-8'>
        {valor.map((_, i) => (
          <button
            key={i}
            onClick={() => handleCardClick(i)}
            className={`h-3 w-3 rounded-full ${currentIndex === i ? 'bg-primaryMy' : 'bg-cl-table-item'}`}
          />
        ))}
      </div>
    </div>
  );
}

export default Carousel;
