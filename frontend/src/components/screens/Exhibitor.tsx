import React from 'react';
import estoque from '../../../public/images/estoque.png';

interface IExhibitorProps {
  icon?: React.ReactNode;
  text?: string;
  number?: number;
}
function Exhibitor({ icon, text, number }: IExhibitorProps) {
  return (
    <div className='flex flex-col'>
      <div className='flex items-center justify-center'>
        <img src={estoque} alt='Icone retratando dado' className='w-14'></img>
        <p className='text-white text-4xl font-rajdhani-semibold'>+2000</p>
      </div>
      <p className='w-full text-center font-rajdhani-medium text-white text-lg'>produtos monitorados</p>
    </div>
  );
}

export default Exhibitor;
