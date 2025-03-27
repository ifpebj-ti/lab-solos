import { Link, useLocation } from 'react-router-dom';
import logo from './../../../public/images/logo.png';
import HomeIcon from '../../../public/icons/sidebar/HomeIcon';
import PlusIcon from '../../../public/icons/sidebar/PlusIcon';
import ProfileIcon from '../../../public/icons/sidebar/ProfileIcon';
import { History, UserPlus } from 'lucide-react';
import SearchIcon from '../../../public/icons/SearchIcon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function SidebarMentor() {
  const location = useLocation();
  const currentPage = location.pathname;

  const menuItems = [
    {
      to: '/mentor/',
      icon: <HomeIcon fill={currentPage === '/mentor/' ? '#16A34A' : '#fff'} />,
      label: 'Home',
    },
    {
      to: '/mentor/history/class',
      icon: (
        <History
          stroke={currentPage == '/mentor/history/class' ? '#16A34A' : '#fff'}
        />
      ),
      label: 'Histórico',
    },
    {
      to: '/mentor/loan/creation',
      icon: (
        <PlusIcon
          fill={currentPage === '/mentor/loan/creation' ? '#16A34A' : '#fff'}
        />
      ),
      label: 'Criar Empréstimo',
    },
    {
      to: '/mentor/users-request',
      icon: (
        <UserPlus
          stroke={currentPage === '/mentor/users-request' ? '#16A34A' : '#fff'}
        />
      ),
      label: 'Solicitações',
    },
    {
      to: '/mentor/search-material',
      icon: (
        <SearchIcon
          fill={currentPage === '/mentor/search-material' ? '#16A34A' : '#fff'}
          tam='18'
        />
      ),
      label: 'Pesquisar Material',
    },
  ];

  return (
    <div className='bg-primaryMy w-[60px] min-h-screen flex items-center flex-col'>
      <img src={logo} className='mt-7 2xl:mt-10 w-12' alt='Logo' />
      <div className='flex flex-col justify-between w-full mt-14 2xl:mt-20 items-center h-full'>
        <div className='flex items-center flex-col'>
          {menuItems.map(({ to, icon, label }) => (
            <TooltipProvider key={to}>
              <Tooltip>
                <TooltipTrigger>
                  <Link
                    to={to}
                    className={`w-10 h-10 ${currentPage === to ? 'bg-backgroundMy hover:bg-opacity-90' : 'bg-primaryMy hover:bg-green-700'} flex items-center justify-center rounded-md transition-all ease-in-out mb-3`}
                  >
                    {icon}
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Link
                  to={'/mentor/profile'}
                  className={`w-10 h-10 ${currentPage === '/mentor/profile' ? 'bg-backgroundMy hover:bg-opacity-90' : 'bg-primaryMy hover:bg-green-700'} flex items-center justify-center rounded-md transition-all ease-in-out mb-6`}
                >
                  <ProfileIcon
                    fill={
                      currentPage === '/mentor/profile' ? '#16A34A' : '#fff'
                    }
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Perfil</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

export default SidebarMentor;
