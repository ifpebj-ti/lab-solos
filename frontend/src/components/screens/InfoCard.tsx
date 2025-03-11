import React from 'react';
import { Link } from 'react-router-dom';

interface IInfoCardProps {
  icon: React.ReactNode;
  text: string;
  notify: boolean;
  link: string;
  quant?: number;
}

function InfoCard({ icon, text, notify, link, quant }: IInfoCardProps) {
  const notifyProp = notify;

  return (
    <Link
      to={link}
      className='relative w-1/4 gap-x-4 h-full border-borderMy border rounded-md flex items-center px-5 hover:bg-cl-table-item transition-all ease-in-out duration-200 shadow-sm'
    >
      <div className='min-w-7'>{icon}</div>
      <p className='font-inter-medium uppercase text-clt-2 text-sm line-clamp-2'>
        {text}
      </p>

      {/* Bolinha vermelha para notificação */}
      {notifyProp && (
        <span className='absolute top-0 left-full transform -translate-x-2 -translate-y-1/2 flex items-center justify-center bg-red-500 rounded-full min-w-[20px] min-h-[20px]'>
          <span className='font-rajdhani-bold text-white text-xs mt-[2px]'>
            {quant}
          </span>
        </span>
      )}
    </Link>
  );
}

export default InfoCard;
