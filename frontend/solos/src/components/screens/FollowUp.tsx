import { ReactNode } from 'react';

type FollowUpCardProps = {
  title: string;
  number: string;
  icon: ReactNode;
};

function FollowUpCard({ title, number, icon }: FollowUpCardProps) {
  return (
    <div className='w-full max-w-72 h-full border border-borderMy rounded-md p-4 flex flex-col justify-between'>
      <div className='w-full flex items-center justify-between'>
        <p className='text-sm font-inter-regular text-clt-2'>{title}</p>
        {icon}
      </div>
      <div className='text-5xl font-inter-medium text-clt-1'>+{number}</div>
    </div>
  );
}

export default FollowUpCard;
