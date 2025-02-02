import { Outlet } from 'react-router-dom';
import SidebarMentee from '../components/base/SidebarMentee';
import Container from '../components/global/Container';

function BaseMentee() {
  return (
    <div className='flex justify-start flex-row w-full h-screen '>
      <SidebarMentee />
      <Container>
        <Outlet />
      </Container>
    </div>
  );
}

export default BaseMentee;
