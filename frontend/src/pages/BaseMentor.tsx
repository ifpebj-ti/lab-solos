import { Outlet } from 'react-router-dom';
import Container from '../components/global/Container';
import SidebarMentor from '@/components/base/SidebarMentor';

function BaseMentor() {
  return (
    <div className='flex justify-start flex-row w-full h-screen '>
      <SidebarMentor />
      <Container>
        <Outlet />
      </Container>
    </div>
  );
}

export default BaseMentor;
