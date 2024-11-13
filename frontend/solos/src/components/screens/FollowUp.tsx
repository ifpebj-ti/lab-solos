import ProfileIcon from '../../../public/icons/sidebar/ProfileIcon';

function FollowUpCard() {
  return (
    <div className='w-full max-w-72 h-full border border-borderMy rounded-md p-4 flex flex-col justify-between'>
      <div className='w-full flex items-center justify-between'>
        <p className='text-sm font-inter-regular text-clt-2'>
          Alerta de Validade
        </p>
        <ProfileIcon fill='#A9A9A9' />
      </div>
      <div className='text-5xl lg:text-6xl font-inter-medium text-clt-1'>
        +335
      </div>
    </div>
  );
}

export default FollowUpCard;
