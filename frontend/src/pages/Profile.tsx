import { useUser } from '@/components/context/UserProvider';
import LoadingIcon from '../../public/icons/LoadingIcon';

function Profile() {
  const { rankID } = useUser();

  if (rankID === null) {
    return (
      <div className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2 bg-backgroundMy'>
        <div className='animate-spin'>
          <LoadingIcon />
        </div>
        Carregando informações do perfil...
      </div>
    );
  }

  return (
    <div className='flex justify-center w-full h-screen items-center flex-col gap-y-5'>
      <h1>Profile</h1>
      <div>Teste pipeline</div>
      <nav>
        {String(rankID) === '1' && <p>Menu para Admin</p>}
        {String(rankID) === '2' && <p>Menu para Mentor</p>}
        {String(rankID) === '3' && <p>Menu para Mentorado</p>}
        {!String(rankID) && <p>Você precisa fazer login.</p>}
      </nav>
    </div>
  );
}

export default Profile;
