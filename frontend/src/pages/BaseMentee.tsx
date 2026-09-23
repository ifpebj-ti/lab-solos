import { Outlet } from 'react-router-dom';
import Container from '../components/global/Container';

function BaseMentee() {
  return (
    <div className='flex min-h-full w-full flex-row justify-start'>
      <Container>
        <Outlet />
      </Container>
    </div>
  );
}

export default BaseMentee;
