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
      className='relative w-1/4 gap-x-4 h-full border-borderMy border rounded-md flex items-center px-5 hover:bg-cl-table-item transition-all ease-in-out duration-200 shadow-sm max-h-32'
    >
      <div className='relative min-w-7 flex items-center justify-center'>
        {icon}
        {/* Bolinha vermelha para notificação em cima do ícone */}
        {notifyProp && (
          <span className='absolute -top-1 -left-1 flex items-center justify-center bg-red-500 rounded-full min-w-[20px] min-h-[20px] border-white border'>
            <span className='font-rajdhani-bold text-white text-xs mt-[2px]'>
              {quant}
            </span>
          </span>
        )}
      </div>
      <p className='font-inter-medium uppercase text-clt-2 text-sm line-clamp-2'>
        {text}
      </p>
    </Link>
  );
}

export default InfoCard;
