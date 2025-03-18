import React from 'react';

interface ICardBootProps {
  icon: React.ReactNode;
  text: string;
}
function CardBoot({ icon, text }: ICardBootProps) {
  return (
    <div className='w-1/4 gap-x-4 h-[70px] border-borderMy border rounded-md flex items-center px-5 hover:bg-cl-table-item transition-all ease-in-out duration-200 shadow-sm'>
      <div className='min-w-7'>{icon}</div>
      <p className='font-inter-medium uppercase text-clt-2 text-xs line-clamp-2'>
        {text}
      </p>
    </div>
  );
}

export default CardBoot;
