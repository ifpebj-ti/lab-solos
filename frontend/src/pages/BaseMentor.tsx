import { Outlet } from 'react-router-dom';
import Container from '../components/global/Container';

function BaseMentor() {
  return (
    <div className='flex min-h-full w-full flex-row justify-start'>
      <Container>
        <Outlet />
      </Container>
    </div>
  );
}

export default BaseMentor;
