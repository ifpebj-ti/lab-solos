import { Outlet } from 'react-router-dom';
import SidebarAdmin from '../components/base/SidebarAdmin';
import Container from '../components/global/Container';

function BaseAdmin() {
  return (
    <div className='flex justify-start flex-row w-full h-screen '>
      <SidebarAdmin />
      <Container>
        <Outlet />
      </Container>
    </div>
  );
}

export default BaseAdmin;
