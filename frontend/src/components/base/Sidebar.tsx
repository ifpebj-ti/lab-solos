import { Link, useLocation } from 'react-router-dom';
import logo from './../../../public/images/logo.png';
import HomeIcon from '../../../public/icons/sidebar/HomeIcon';
import PlusIcon from '../../../public/icons/sidebar/PlusIcon';
import ProfileIcon from '../../../public/icons/sidebar/ProfileIcon';
import FollowUpIcon from '../../../public/icons/sidebar/FollowUpIcon';
import { History, UserCircle } from 'lucide-react';
import { useUser } from '../context/UserProvider';
import SearchIcon from '../../../public/icons/SearchIcon';
import HistoryText from '../../../public/icons/HistoryText';

function Sidebar() {
  const { rankID } = useUser();
  const location = useLocation();
  const currentPage = location.pathname;
  const isHistoryActive = currentPage.startsWith('/history');
  const isInsertActive = currentPage.startsWith('/insert');
  const isUsersActive = currentPage.startsWith('/users');

  return (
    <div className='bg-primaryMy w-[70px] min-h-screen flex items-center flex-col'>
      <img src={logo} className='mt-7 2xl:mt-10 w-12'></img>
      <div className='flex flex-col justify-between w-full mt-14 2xl:mt-20 items-center h-full'>
        <div>
          <Link
            to={'/'}
            className={`w-11 h-11 ${currentPage === '/' ? 'bg-backgroundMy hover:bg-opacity-90' : 'bg-primaryMy hover:bg-green-700'} flex items-center justify-center rounded-md transition-all ease-in-out mb-3`}
          >
            <HomeIcon fill={currentPage == '/' ? '#16A34A' : '#fff'} />
          </Link>

          {/* admin */}
          {String(rankID) === '1' && (
            <Link
              to={'/insert'}
              className={`w-11 h-11 ${isInsertActive ? 'bg-backgroundMy hover:bg-opacity-90' : 'bg-primaryMy hover:bg-green-700'} flex items-center justify-center rounded-md transition-all ease-in-out mb-3`}
            >
              <PlusIcon fill={isInsertActive ? '#16A34A' : '#fff'} />
            </Link>
          )}
          {String(rankID) === '1' && (
            <Link
              to={'/followUp'}
              className={`w-11 h-11 ${currentPage === '/followUp' ? 'bg-backgroundMy hover:bg-opacity-90' : 'bg-primaryMy hover:bg-green-700'} flex items-center justify-center rounded-md transition-all ease-in-out mb-3`}
            >
              <FollowUpIcon
                fill={currentPage == '/followUp' ? '#16A34A' : '#fff'}
              />
            </Link>
          )}

          {/* Mentor */}
          {String(rankID) === '2' && (
            <Link
              to={'/history/class'}
              className={`w-11 h-11 ${isHistoryActive ? 'bg-backgroundMy hover:bg-opacity-90' : 'bg-primaryMy hover:bg-green-700'} flex items-center justify-center rounded-md transition-all ease-in-out mb-3`}
            >
              <History stroke={isHistoryActive ? '#16A34A' : '#fff'} />
            </Link>
          )}
          {String(rankID) === '1' && (
            <Link
              to={'/users'}
              className={`w-11 h-11 ${isUsersActive ? 'bg-backgroundMy hover:bg-opacity-90' : 'bg-primaryMy hover:bg-green-700'} flex items-center justify-center rounded-md transition-all ease-in-out mb-3`}
            >
              <UserCircle stroke={isUsersActive ? '#16A34A' : '#fff'} />
            </Link>
          )}
          <Link
            to={'/search/material'}
            className={`w-11 h-11 ${currentPage === '/search/material' ? 'bg-backgroundMy hover:bg-opacity-90' : 'bg-primaryMy hover:bg-green-700'} flex items-center justify-center rounded-md transition-all ease-in-out mb-3`}
          >
            <SearchIcon
              fill={currentPage === '/search/material' ? '#16A34A' : '#fff'}
              tam='18'
            />
          </Link>
          {String(rankID) === '3' && (
            <Link
              to={'/history/mentoring'}
              className={`w-11 h-11 ${currentPage === '/history/mentoring' ? 'bg-backgroundMy hover:bg-opacity-90' : 'bg-primaryMy hover:bg-green-700'} flex items-center justify-center rounded-md transition-all ease-in-out mb-3`}
            >
              <HistoryText
                fill={currentPage === '/history/mentoring' ? '#16A34A' : '#fff'}
                tam='18'
              />
            </Link>
          )}
        </div>
        <div>
          <Link
            to={'/profile'}
            className={`w-11 h-11 ${currentPage === '/profile' ? 'bg-backgroundMy hover:bg-opacity-90' : 'bg-primaryMy hover:bg-green-700'} flex items-center justify-center rounded-md transition-all ease-in-out mb-6`}
          >
            <ProfileIcon
              fill={currentPage == '/profile' ? '#16A34A' : '#fff'}
            />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
