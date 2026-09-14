import { Link, useLocation, useNavigate } from 'react-router-dom';
import img404 from '../../public/images/404.png';
import { ArrowLeft } from 'lucide-react';
import { clearSession, readSession } from '@/auth/session';
import BackLink from '@/components/global/BackLink';

const SUPPORTED_ROLES = new Set(['Administrador', 'Mentor', 'Mentorado']);

function Page404() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = readSession();
  const isUnsupportedSession =
    session !== null && !SUPPORTED_ROLES.has(session.role);

  const handleExplicitLogout = () => {
    clearSession({ discardAuthContext: true });
    navigate('/');
  };

  return (
    <div className='h-screen w-full flex justify-center items-center flex-col bg-gradient-to-tr from-[#f4f4f5] to-[#f4f4f5] min-h-screen pb-9'>
      <img src={img404} alt='Página não encontrada' className='w-96'></img>
      <div className='w-full flex justify-center items-center flex-col overflow-y-auto bg-backgroundMy font-inter-regular text-lg'>
        {isUnsupportedSession ? (
          <>
            <h1>Acesso indisponível</h1>
            <p>Nível de acesso não suportado para esta sessão.</p>
            <button
              type='button'
              onClick={handleExplicitLogout}
              className='px-5 py-2 mt-3 rounded-md bg-primaryMy text-white flex gap-x-2'
            >
              Sair
            </button>
          </>
        ) : (
          <>
            <p>Página não encontrada</p>
            {session?.requiresPasswordChange ? (
              <Link
                to='/change-password-required'
                className='px-5 py-2 mt-3 rounded-md bg-primaryMy text-white flex gap-x-2'
              >
                <ArrowLeft className='mt-[2px]' />
                Voltar
              </Link>
            ) : session ? (
              <BackLink
                pathname={location.pathname}
                role={session.role}
                className='px-5 py-2 mt-3 rounded-md bg-primaryMy text-white flex gap-x-2'
              >
                <ArrowLeft className='mt-[2px]' />
                Voltar
              </BackLink>
            ) : (
              <Link
                to='/'
                className='px-5 py-2 mt-3 rounded-md bg-primaryMy text-white flex gap-x-2'
              >
                <ArrowLeft className='mt-[2px]' />
                Voltar
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Page404;
