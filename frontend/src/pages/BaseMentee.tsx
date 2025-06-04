import { Outlet } from 'react-router-dom';
import Container from '../components/global/Container';

function BaseMentee() {
  return (
    <div className='flex justify-start flex-row w-full h-screen '>
      <Container>
        <Outlet />
      </Container>
    </div>
  );
}

export default BaseMentee;
