import logo from '../../public/images/logoGreen.png';
import { Link } from 'react-router-dom';
import AlertIcon from '../../public/icons/AlertIcon';
import JoinIcon from '../../public/icons/JoinIcon';
import LoanIcon from '../../public/icons/LoanIcon';
import CardBoot from '@/components/screens/CardBoot';
import { LinkedinIcon, Mail, Phone } from 'lucide-react';
import Exhibitor from '@/components/screens/Exhibitor';

function BootScreen() {
  return (
    <>
      <div className='h-screen max-h-screen w-full flex justify-start items-center flex-col bg-backgroundMy'>
        <div className='w-11/12 h-[15%] flex items-center justify-between'>
          <img src={logo} alt='Logo Labon' className='w-20 -ml-2'></img>
          <Link
            to={'/'}
            className='h-9 border border-primaryMy rounded-[4px] px-6 flex items-center font-inter-medium text-primaryMy'
          >
            Login
          </Link>
        </div>
        <div className='w-11/12 h-[25%] flex items-center flex-col justify-center -mt-4'>
          <p className='font-rajdhani-semibold text-[115px] leading-[110px] text-primaryMy -mb-[11px]'>
            LabON
          </p>
          <p className='font-rajdhani-medium text-[28px] text-clt-2'>
            Transforme a Gestão do Seu Laboratório!
          </p>
          <div className='flex items-center justify-center gap-x-7 mt-3 font-rajdhani-semibold uppercase'>
            <Link
              to={'/'}
              className='h-9 px-9 bg-primaryMy border border-primaryMy flex items-center justify-center rounded-[4px] text-white'
            >
              Comece agora
            </Link>
            <Link
              to={'/'}
              className='h-9 px-9 bg-backgroundMy border border-primaryMy flex items-center justify-center rounded-[4px] text-primaryMy'
            >
              Saiba mais
            </Link>
          </div>
        </div>
        <div className='w-11/12 h-[20%] flex items-center min-h-24 justify-between gap-x-9 mt-4'>
          <CardBoot icon={<AlertIcon />} text='Produtos com Alerta' />
          <CardBoot icon={<JoinIcon />} text='Solicitações de Cadastro' />
          <CardBoot icon={<LoanIcon />} text='Solicitações de Empréstimo' />
          <CardBoot icon={<LoanIcon />} text='Solicitações de Empréstimo' />
        </div>
        <div className='w-full h-[30%]'>
          <div className='w-full h-[70%] bg-primaryMy flex items-center justify-center'>
            <div className='w-11/12 h-full flex items-center justify-between'>
              <Exhibitor/>
              <Exhibitor/>
              <Exhibitor/>
              <Exhibitor/>
              <Exhibitor/>
            </div>
          </div>
          {/* <div className='flex items-center mt-4 justify-center w-full h-[30%]'>
            <div className='h-2 w-3/5 rounded-full bg-primaryMy'></div>
          </div> */}
        </div>
        <div className='w-11/12 h-[10%] flex items-center'>
          <p className='font-rajdhani-semibold text-2xl text-primaryMy mr-4'>
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
