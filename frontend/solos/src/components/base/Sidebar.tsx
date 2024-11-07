import { Link, useLocation } from 'react-router-dom';
import logo from './../../../public/images/logo.png';
import HomeIcon from '../../../public/icons/sidebar/HomeIcon';
import PlusIcon from '../../../public/icons/sidebar/PlusIcon';
import ProfileIcon from '../../../public/icons/sidebar/ProfileIcon';

function Sidebar() {
  const location = useLocation();
  const currentPage = location.pathname;

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
          <Link
            to={'/register'}
            className={`w-11 h-11 ${currentPage === '/register' ? 'bg-backgroundMy hover:bg-opacity-90' : 'bg-primaryMy hover:bg-green-700'} flex items-center justify-center rounded-md transition-all ease-in-out mb-3`}
          >
            <PlusIcon fill={currentPage == '/register' ? '#16A34A' : '#fff'} />
          </Link>
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
