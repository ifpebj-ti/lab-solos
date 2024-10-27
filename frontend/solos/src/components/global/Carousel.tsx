// src/components/Carousel.tsx
import React, { useState } from 'react';

interface CarouselProps {
  items: string[];
}

const Carousel: React.FC<CarouselProps> = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(1);

  const totalItems = items.length;

  // Controla o índice para que seja circular
  const getCircularIndex = (index: number) => {
    return (index + totalItems) % totalItems;
  };

//   const goToNext = () => {
//     setCurrentIndex((prevIndex) => getCircularIndex(prevIndex + 1));
//   };

//   const goToPrev = () => {
//     setCurrentIndex((prevIndex) => getCircularIndex(prevIndex - 1));
//   };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Carrossel */}
      <div className="flex space-x-4 gap-x-8 items-center justify-center w-full">
        {Array.from({ length: 3 }, (_, i) => {
          const itemIndex = getCircularIndex(currentIndex + i - 1);
          const scaleClass = i === 1 ? 'scale-125' : 'scale-100';

          return (
            <div
              key={itemIndex}
              className={`flex items-center justify-center transition-transform ${scaleClass}`}
              style={{
                width: i === 1 ? '200px' : '150px',
                height: i === 1 ? '110px' : '100px',
              }}
            >
              <div className="bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center w-full h-full">
                {items[itemIndex]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicadores */}
      <div className="flex space-x-2 mt-6">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`h-3 w-3 rounded-full ${
              currentIndex === i ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Navegação */}
      {/* <div className="flex space-x-4 mt-2">
        <button onClick={goToPrev} className="p-2 bg-gray-300 rounded">Anterior</button>
        <button onClick={goToNext} className="p-2 bg-gray-300 rounded">Próximo</button>
      </div> */}
    </div>
  );
};

export default Carousel;
