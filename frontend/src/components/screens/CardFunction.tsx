import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface ICardFunction {
  text: string;
  notify: boolean;
  link: string;
  icon: ReactNode;
}

function CardFunction({ text, notify, link, icon }: ICardFunction) {
  const notifyProp = notify;
  return (
    <Link
      to={link}
      className='relative w-48 h-32 rounded-md border border-borderMy  shadow-md flex items-center justify-center flex-col px-5 text-center gap-1 hover:bg-cl-table-item'
    >
      {icon}
      <p className='font-inter-regular'>{text}</p>
      {/* Bolinha vermelha para notificação */}
      {notifyProp && (
        <span className='absolute top-0 left-full transform -translate-x-2 -translate-y-1/2 flex items-center justify-center bg-red-500 rounded-full min-w-[15px] min-h-[15px]'></span>
      )}
    </Link>
  );
}

export default CardFunction;
