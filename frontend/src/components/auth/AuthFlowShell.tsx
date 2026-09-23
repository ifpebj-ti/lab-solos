import { useContext, type ReactNode } from 'react';

import logo from '../../../public/images/logo.png';
import { ThemeSwitch } from '@/theme/ThemeSwitch';
import { ThemeContext } from '@/theme/themeContext';

type AuthFlowShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  titleId?: string;
  maxWidth?: string;
};

function AuthFlowShell({
  title,
  description,
  children,
  titleId = 'auth-flow-title',
  maxWidth = 'max-w-md',
}: AuthFlowShellProps) {
  const themeContext = useContext(ThemeContext);

  return (
    <main
      className='flex min-h-svh w-full items-center justify-center bg-canvas px-4 py-8 text-clt-2 sm:px-6'
      aria-labelledby={titleId}
    >
      {themeContext ? <ThemeSwitch /> : null}
      <section
        className={`w-full ${maxWidth} overflow-hidden rounded-xl border border-borderMy bg-surface shadow-lg`}
      >
        <header className='flex items-center gap-4 bg-primaryMy px-5 py-5 text-white sm:px-7'>
          <img alt='LabOn' src={logo} className='h-16 w-16 object-contain' />
          <div className='min-w-0'>
            <p className='font-inter-medium text-sm uppercase tracking-[0.12em]'>
              IFPE
            </p>
            <h1 id={titleId} className='font-rajdhani-semibold text-3xl'>
              {title}
            </h1>
            <p className='font-inter-regular text-sm text-white/90'>
              Laboratórios e Sustentabilidade Ambiental
            </p>
          </div>
        </header>

        <div className='px-5 py-6 sm:px-7'>
          <p className='mb-5 text-sm text-clt-1'>{description}</p>
          {children}
        </div>
      </section>
    </main>
  );
}

export default AuthFlowShell;
