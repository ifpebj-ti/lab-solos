import React from 'react';

interface IExhibitorProps {
  icon?: React.ReactNode; // Mantemos a flexibilidade para aceitar componentes
  text?: string;
  number?: number;
  wid: string;
}

function Exhibitor({ icon, text, number, wid }: IExhibitorProps) {
  return (
    <div className='flex flex-col'>
      <div className='flex items-center justify-center'>
        {/* Se `icon` for uma string (URL), renderiza como `<img>` */}
        {typeof icon === 'string' ? (
          <img src={icon} alt='Ícone' className={`w-${wid}`} />
        ) : (
          // Se `icon` for um componente React, renderiza diretamente
          <span className={`w-${wid}`}>{icon}</span>
        )}

        <p className='text-primaryMy text-4xl font-rajdhani-semibold'>
          +{number}
        </p>
      </div>
      <p className='w-full text-center font-rajdhani-semibold text-primaryMy mt-1'>
        {text}
      </p>
    </div>
  );
}

export default Exhibitor;
