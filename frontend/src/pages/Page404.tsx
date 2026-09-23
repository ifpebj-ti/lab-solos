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
    <main className='flex min-h-svh w-full flex-col items-center justify-center bg-canvas px-4 py-8 text-clt-2'>
      <div className='w-full max-w-md overflow-hidden rounded-xl border border-borderMy bg-surface shadow-lg'>
        <img
          src={img404}
          alt='Página não encontrada'
          className='mx-auto w-full max-w-xs object-contain p-6'
        ></img>
        <div className='flex w-full flex-col items-center justify-center gap-2 border-t border-borderMy px-5 py-6 text-center font-inter-regular text-lg sm:px-7'>
          {isUnsupportedSession ? (
            <>
              <h1>Acesso indisponível</h1>
              <p>Nível de acesso não suportado para esta sessão.</p>
              <button
                type='button'
                onClick={handleExplicitLogout}
                className='mt-3 flex min-h-11 items-center gap-2 rounded-md bg-primaryMy px-5 text-white transition-colors hover:bg-primaryMy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
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
                  aria-label='Voltar'
                  title='Voltar'
                  className='mt-3 flex min-h-11 items-center gap-2 rounded-md bg-primaryMy px-5 text-white transition-colors hover:bg-primaryMy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
                >
                  <ArrowLeft aria-hidden='true' className='h-5 w-5' />
                </Link>
              ) : session ? (
                <BackLink
                  pathname={location.pathname}
                  role={session.role}
                  className='mt-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-primaryMy px-3 text-white transition-colors hover:bg-primaryMy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
                />
              ) : (
                <Link
                  to='/'
                  aria-label='Voltar'
                  title='Voltar'
                  className='mt-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-primaryMy px-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
                >
                  <ArrowLeft aria-hidden='true' className='h-5 w-5' />
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default Page404;
