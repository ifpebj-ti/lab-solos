import logo from '../../public/images/logoGreen.png';
import { Link } from 'react-router-dom';
import AlertIcon from '../../public/icons/AlertIcon';
import JoinIcon from '../../public/icons/JoinIcon';
import LoanIcon from '../../public/icons/LoanIcon';
import CardBoot from '@/components/screens/CardBoot';
import { LinkedinIcon, Mail, Phone } from 'lucide-react';
import Exhibitor from '@/components/screens/Exhibitor';
import laboratory from '../../public/images/laboratory.png';

function BootScreen() {
  return (
    <>
      <div className='h-screen max-h-screen w-full flex justify-start items-center flex-col bg-backgroundMy'>
        <div className='w-11/12 h-[45%] flex items-end justify-between'>
          <div className='flex flex-col items-start'>
            <div className='flex'>
              <img
                src={logo}
                alt='Logo Labon'
                className='w-28 -ml-2 h-28 -mt-3'
              ></img>
              <p className='font-rajdhani-semibold text-[115px] leading-[110px] text-primaryMy'>
                LabON
              </p>
            </div>
            <p className='font-rajdhani-medium text-2xl text-clt-2'>
              Transforme a Gestão do Seu Laboratório!
            </p>
            <div className='flex items-center justify-center gap-x-7 mt-3 font-rajdhani-semibold uppercase'>
              <Link
                to={'/'}
                className='h-9 px-10 bg-primaryMy border border-primaryMy flex items-center justify-center rounded-[4px] text-white'
              >
                Comece agora
              </Link>
              <Link
                to={'/'}
                className='h-9 px-10 bg-backgroundMy border border-primaryMy flex items-center justify-center rounded-[4px] text-primaryMy'
              >
                Saiba mais
              </Link>
            </div>
          </div>
          <img src={laboratory} alt='' className='w-72'></img>
        </div>
        <div className='w-11/12 h-[25%] flex items-center min-h-24 justify-between gap-x-9'>
          <CardBoot icon={<AlertIcon />} text='Produtos com Alerta' />
          <CardBoot icon={<JoinIcon />} text='Solicitações de Cadastro' />
          <CardBoot icon={<LoanIcon />} text='Solicitações de Empréstimo' />
          <CardBoot icon={<LoanIcon />} text='Solicitações de Empréstimo' />
        </div>
        <div className='w-full h-[20%]'>
          <div className='w-full h-full bg-primaryMy flex items-center justify-center'>
            <div className='w-11/12 h-full flex items-center justify-between'>
              <Exhibitor />
              <Exhibitor />
              <Exhibitor />
              <Exhibitor />
            </div>
          </div>
        </div>
        <div className='w-11/12 h-[10%] flex items-center'>
          <p className='font-rajdhani-semibold text-xl text-primaryMy mr-4 mt-1'>
            LabON
          </p>
          <div className='flex gap-x-2'>
            <div className='h-9 w-9 rounded-full bg-primaryMy flex items-center justify-center hover:scale-110 hover:cursor-pointer'>
              <LinkedinIcon stroke='#fff' width={20} />
            </div>
            <div className='h-9 w-9 rounded-full bg-primaryMy flex items-center justify-center hover:scale-110 hover:cursor-pointer'>
              <Mail stroke='#fff' width={20} />
            </div>
            <div className='h-9 w-9 rounded-full bg-primaryMy flex items-center justify-center hover:scale-110 hover:cursor-pointer'>
              <Phone stroke='#fff' width={20} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default BootScreen;
