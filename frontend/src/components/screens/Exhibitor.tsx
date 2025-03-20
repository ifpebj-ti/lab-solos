import React from 'react';
interface IExhibitorProps {
  icon?: React.ReactNode;
  text?: string;
  number?: number;
  wid: string;
}
function Exhibitor({ icon, text, number, wid }: IExhibitorProps) {
  return (
    <div className='flex flex-col'>
      <div className='flex items-center justify-center'>
        <img
          src={icon}
          alt='Icone retratando dado'
          className={`w-${wid}`}
        ></img>
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
