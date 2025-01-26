import { Link } from 'react-router-dom';
import img404 from '../../public/images/404.png';
import { ArrowLeft } from 'lucide-react';

function Page404() {
  return (
    <div className='h-screen w-full flex justify-center items-center flex-col bg-gradient-to-tr from-[#f4f4f5] to-[#f4f4f5]'>
      <img src={img404} className='w-96'></img>
      <div className='w-full flex justify-center items-center flex-col overflow-y-auto bg-backgroundMy font-inter-regular text-lg'>
        <p className=''>Página não encontrada</p>
        <Link
          to={'/'}
          className='px-5 py-2 mt-3 rounded-md bg-primaryMy text-white flex gap-x-2'
        >
          <ArrowLeft className='mt-[2px]' />
          Voltar
        </Link>
      </div>
    </div>
  );
}

export default Page404;
