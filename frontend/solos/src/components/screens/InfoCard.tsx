import React from 'react';
import { Link } from 'react-router-dom';

interface IInfoCardProps {
  icon: React.ReactNode;
  text: string;
  notify: boolean;
}

function InfoCard({ icon, text, notify }: IInfoCardProps) {
  const notifyProp = notify;

  return (
    <Link
      to={'/profile'}
      className='relative w-1/4 gap-x-4 h-full border-borderMy border rounded-md flex items-center px-5 hover:bg-cl-table-item transition-all ease-in-out duration-200 shadow-sm'
    >
      <div className='min-w-8'>{icon}</div>
      <p className='font-inter-medium uppercase text-clt-2 text-sm'>{text}</p>

      {/* Bolinha vermelha para notificação */}
      {notifyProp && (
        <span className='absolute top-0 left-full transform -translate-x-2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full'></span>
      )}
    </Link>
  );
}

export default InfoCard;
