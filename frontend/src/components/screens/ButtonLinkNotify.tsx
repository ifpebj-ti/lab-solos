// import { Link } from 'react-router-dom';

interface IButtonLinkNotifyProps {
  text: string;
  notify: boolean;
  // link: string;
  quant?: number;
}

function ButtonLinkNotify({
  text,
  notify,
  // link,
  quant,
}: IButtonLinkNotifyProps) {
  const notifyProp = notify;

  return (
    <div className='relative gap-x-4 border-borderMy border rounded-md flex items-center px-7 h-11 hover:bg-cl-table-item transition-all ease-in-out duration-200 shadow-sm'>
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
    </div>
  );
}

export default ButtonLinkNotify;
