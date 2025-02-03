import { Link, useLocation } from 'react-router-dom';
import logo from './../../../public/images/logo.png';
import HomeIcon from '../../../public/icons/sidebar/HomeIcon';
import PlusIcon from '../../../public/icons/sidebar/PlusIcon';
import FollowUpIcon from '../../../public/icons/sidebar/FollowUpIcon';
import { UserCircle } from 'lucide-react';
import ProfileIcon from '../../../public/icons/sidebar/ProfileIcon';
import SearchIcon from '../../../public/icons/SearchIcon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function SidebarAdmin() {
  const location = useLocation();
  const currentPage = location.pathname;

  const menuItems = [
    {
      to: '/admin/',
      icon: <HomeIcon fill={currentPage === '/admin/' ? '#16A34A' : '#fff'} />,
      label: 'Home',
    },
    {
      to: '/admin/insert',
      icon: <PlusIcon fill={currentPage === '/admin/insert' ? '#16A34A' : '#fff'} />,
      label: 'Adicionar',
    },
    {
      to: '/admin/follow-up',
      icon: <FollowUpIcon fill={currentPage === '/admin/follow-up' ? '#16A34A' : '#fff'} />,
      label: 'Acompanhamento',
    },
    {
      to: '/admin/users',
      icon: <UserCircle stroke={currentPage === '/admin/users' ? '#16A34A' : '#fff'} />,
      label: 'Usuários',
    },
    {
      to: '/admin/search-material',
      icon: <SearchIcon fill={currentPage === '/admin/search-material' ? '#16A34A' : '#fff'} tam="18" />,
      label: 'Pesquisar Material',
    },
  ];

  return (
    <div className="bg-primaryMy w-[70px] min-h-screen flex items-center flex-col">
      <img src={logo} className="mt-7 2xl:mt-10 w-12" alt="Logo" />
      <div className="flex flex-col justify-between w-full mt-14 2xl:mt-20 items-center h-full">
        <div className="flex items-center flex-col">
          {menuItems.map(({ to, icon, label }) => (
            <TooltipProvider key={to}>
              <Tooltip>
                <TooltipTrigger>
                  <Link
                    to={to}
                    className={`w-11 h-11 ${
                      currentPage === to ? 'bg-backgroundMy hover:bg-opacity-90' : 'bg-primaryMy hover:bg-green-700'
                    } flex items-center justify-center rounded-md transition-all ease-in-out mb-3`}
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
                  to="/admin/profile"
                  className={`w-11 h-11 ${
                    currentPage === '/admin/profile' ? 'bg-backgroundMy hover:bg-opacity-90' : 'bg-primaryMy hover:bg-green-700'
                  } flex items-center justify-center rounded-md transition-all ease-in-out mb-6`}
                >
                  <ProfileIcon fill={currentPage === '/admin/profile' ? '#16A34A' : '#fff'} />
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

export default SidebarAdmin;
