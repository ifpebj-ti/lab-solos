import logo from '../../public/images/logoGreen.png';
import { Link } from 'react-router-dom';
import CardBoot from '@/components/screens/CardBoot';
import {
  Box,
  FileKey2,
  FileText,
  LinkedinIcon,
  Mail,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import Exhibitor from '@/components/screens/Exhibitor';
import laboratory from '../../public/images/laboratoryObjects.png';
import lab from '../../public/images/analises-quimicas.png';
import estoque from '../../public/images/estoque-pronto.png';
import pessoas from '../../public/images/silhueta-de-multiplos-usuarios.png';
import folha from '../../public/images/contrato.png';


function BootScreen() {
  return (
    <div className='h-screen max-h-screen w-full flex justify-start items-center flex-col bg-backgroundMy'>
      <div className='w-full bg-gradient-to-r from-backgroundMy to-primaryMy bg-slate-500 h-[12%] flex items-center justify-center'>
        <div className='w-11/12 h-full flex items-center justify-between'>
          <div className='flex items-end justify-center gap-x-3'>
            <img src={logo} className='w-10'></img>
            <p className='text-3xl font-rajdhani-semibold text-primaryMy'>
              LabON
            </p>
          </div>
          <Link
            to={'/'}
            className='shadow-lg bg-backgroundMy h-10 px-7 rounded-md flex items-center justify-center uppercase font-rajdhani-semibold text-primaryMy  hover:scale-[102%]'
          >
            Comece agora
          </Link>
        </div>
      </div>
      <div className='w-11/12 h-[33%] flex items-center justify-between '>
        <div className='w-[50%] h-full flex flex-col items-start justify-end'>
          <p className='font-rajdhani-semibold text-4xl text-clt-2'>Conheça o <span className='text-primaryMy'>LabON</span>: A Solução </p>
          <p className='font-rajdhani-semibold text-4xl text-clt-2'>Completa para <span className='text-primaryMy'>Gestão</span> de </p>
          <p className='font-rajdhani-semibold text-4xl text-primaryMy'>Laboratórios</p>
          <p className='font-rajdhani-medium text-clt-2'>
            Descubra como o LabON pode transformar a gestão do seu laboratório
            com eficiência, segurança e praticidade.
          </p>
        </div>
        <img src={laboratory} className='h-[105%] mt-4'></img>
      </div>
      <div className='w-11/12 h-[23%] flex items-center justify-between gap-x-9'>
        <CardBoot
          icon={<Box stroke='#16a34a' width={30} strokeWidth={2} />}
          text='Controle de Estoque'
        />
        <CardBoot
          icon={<FileKey2 stroke='#16a34a' width={30} strokeWidth={2} />}
          text='Rastreabilidade de Materiais'
        />
        <CardBoot
          icon={<ShieldCheck stroke='#16a34a' width={30} strokeWidth={2} />}
          text='Segurança e Conformidade'
        />
        <CardBoot
          icon={<FileText stroke='#16a34a' width={30} strokeWidth={2} />}
          text='Relatórios Automáticos'
        />
      </div>
      <div className='w-full h-[20%]'>
        <div className='w-full h-full bg-backgroundMy flex items-center justify-center'>
          <div className='w-11/12 h-full flex items-center justify-between px-3 border-y border-borderMy'>
            <Exhibitor icon={lab} text='laboratórios ativos' number={25} wid='10' />
            <Exhibitor icon={folha} text='empréstimos realizados' number={6682} wid='9' />
            <Exhibitor icon={estoque} text='produtos monitorados' number={279} wid='11' />
            <Exhibitor icon={pessoas} text='usuários ativos' number={643} wid='10' />
          </div>
        </div>
      </div>
      <div className='w-11/12 h-[12%] flex items-center justify-end'>
        <p className='font-rajdhani-semibold text-xl text-primaryMy mr-4 mt-1'>
          LabON
        </p>
        <div className='flex gap-x-2'>
          <div className='h-8 w-8 rounded-full bg-primaryMy flex items-center justify-center hover:scale-110 hover:cursor-pointer'>
            <LinkedinIcon stroke='#fff' width={17} />
          </div>
          <div className='h-8 w-8 rounded-full bg-primaryMy flex items-center justify-center hover:scale-110 hover:cursor-pointer'>
            <Mail stroke='#fff' width={17} />
          </div>
          <div className='h-8 w-8 rounded-full bg-primaryMy flex items-center justify-center hover:scale-110 hover:cursor-pointer'>
            <Phone stroke='#fff' width={17} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default BootScreen;
