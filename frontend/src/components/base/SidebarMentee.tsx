import { Link, useLocation } from 'react-router-dom';
import logo from './../../../public/images/logo.png';
import HomeIcon from '../../../public/icons/sidebar/HomeIcon';
import SearchIcon from '../../../public/icons/SearchIcon';
import ProfileIcon from '../../../public/icons/sidebar/ProfileIcon';
import HistoryText from '../../../public/icons/HistoryText';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function SidebarMentee() {
  const location = useLocation();
  const currentPage = location.pathname;
  // const isHistoryActive = currentPage.startsWith('/history');

  return (
    <div className='bg-primaryMy w-[70px] min-h-screen flex items-center flex-col'>
      <img src={logo} className='mt-7 2xl:mt-10 w-12'></img>
      <div className='flex flex-col justify-between w-full mt-14 2xl:mt-20 items-center h-full'>
        <div className='flex items-center flex-col'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Link
                  to={'/mentee/'}
                  className={`w-11 h-11 ${currentPage === '/mentee/' ? 'bg-backgroundMy hover:bg-opacity-90' : 'bg-primaryMy hover:bg-green-700'} flex items-center justify-center rounded-md transition-all ease-in-out mb-3`}
                >
                  <HomeIcon
                    fill={currentPage == '/mentee/' ? '#16A34A' : '#fff'}
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Home</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Link
                  to={'search-material'}
                  className={`w-11 h-11 ${currentPage === '/mentee/search-material' ? 'bg-backgroundMy hover:bg-opacity-90' : 'bg-primaryMy hover:bg-green-700'} flex items-center justify-center rounded-md transition-all ease-in-out mb-3`}
                >
                  <SearchIcon
                    fill={
                      currentPage == '/mentee/search-material' ? '#16A34A' : '#fff'
                    }
                    tam='18'
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Pesquisar Material</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Link
                  to={'/mentee/history/mentoring'}
                  className={`w-11 h-11 ${currentPage === '/mentee/history/mentoring' ? 'bg-backgroundMy hover:bg-opacity-90' : 'bg-primaryMy hover:bg-green-700'} flex items-center justify-center rounded-md transition-all ease-in-out mb-3`}
                >
                  <HistoryText
                    fill={
                      currentPage == '/mentee/history/mentoring' ? '#16A34A' : '#fff'
                    }
                    tam='18'
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Histórico Pessoal</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Link
                  to={'/mentee/profile'}
                  className={`w-11 h-11 ${currentPage === '/mentee/profile' ? 'bg-backgroundMy hover:bg-opacity-90' : 'bg-primaryMy hover:bg-green-700'} flex items-center justify-center rounded-md transition-all ease-in-out mb-6`}
                >
                  <ProfileIcon
                    fill={currentPage == '/mentee/profile' ? '#16A34A' : '#fff'}
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

export default SidebarMentee;
