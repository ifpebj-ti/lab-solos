import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { consumeAuthNotice, SESSION_EXPIRED_NOTICE } from '@/auth/intendedRoute';
import { clearSession } from '@/auth/session';
import { createApplicationError } from '@/errors/applicationError';
import { ERROR_CATALOG, OPERATION_IDS } from '@/errors/errorCatalog';
import { notifyError } from '@/errors/presentError';
import { authenticate } from '@/integration/Auth';
import InputText from '@/components/global/inputs/Text';
import InputPassword from '@/components/global/inputs/Password';
import { toast } from '@/components/hooks/use-toast';
import { ThemeSwitch } from '@/theme/ThemeSwitch';
import logo from '../../public/images/logo.png';

const submitLoginSchema = z.object({
  email: z.string().email('Digite um email válido').toLowerCase(),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

type LoginFormData = z.infer<typeof submitLoginSchema>;

function Login() {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(submitLoginSchema),
  });
  const navigate = useNavigate();

  useEffect(() => {
    clearSession();
    if (consumeAuthNotice() === SESSION_EXPIRED_NOTICE) {
      notifyError(
        createApplicationError({
          category: 'authentication',
          message: ERROR_CATALOG.authentication.message,
          retryable: false,
        }),
        OPERATION_IDS.login
      );
    }
  }, []);

  async function postLogin(data: LoginFormData) {
    setLoading(true);
    try {
      await authenticate({ method: 'POST', params: data }, navigate);
      toast({
        title: '✅ Acesso autorizado',
        description: 'Bem-vindo de volta!',
      });
    } catch (error: unknown) {
      notifyError(error, OPERATION_IDS.login);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className='flex min-h-svh w-full items-center justify-center bg-canvas px-4 pb-8 pt-24 text-clt-2 sm:px-6'
      aria-labelledby='login-title'
    >
      <ThemeSwitch />
      <section className='w-full max-w-md overflow-hidden rounded-xl border border-borderMy bg-surface shadow-lg'>
        <header className='flex items-center gap-4 bg-primaryMy px-5 py-5 text-white sm:px-7'>
          <img alt='LabOn' src={logo} className='h-16 w-16 object-contain' />
          <div className='min-w-0'>
            <p className='font-inter-medium text-sm uppercase tracking-[0.12em]'>IFPE</p>
            <h1 id='login-title' className='font-rajdhani-semibold text-3xl'>
              Entrar no LabOn
            </h1>
            <p className='font-inter-regular text-sm text-white/90'>
              Laboratórios e Sustentabilidade Ambiental
            </p>
          </div>
        </header>

        <div className='px-5 py-6 sm:px-7'>
          <p className='mb-4 text-sm text-clt-1'>Acesse sua conta institucional.</p>
          <form onSubmit={handleSubmit(postLogin)} className='flex w-full flex-col gap-1'>
            <InputText
              label='Email'
              type='email'
              register={register}
              error={errors.email?.message}
              name='email'
              placeholder='nome@exemplo.com'
            />
            <InputPassword
              label='Senha'
              register={register}
              error={errors.password?.message}
              name='password'
            />

            <div className='mt-3 flex flex-col gap-2 text-sm'>
              <div className='flex flex-wrap gap-1'>
                <span>Não possui conta?</span>
                <Link
                  to='/create-account'
                  className='font-inter-medium text-clt-2 underline decoration-primaryMy underline-offset-2 hover:text-primaryMy'
                >
                  Crie a sua agora.
                </Link>
              </div>
              <Link
                to='/forgot-your-password'
                className='w-fit font-inter-medium text-clt-2 underline decoration-primaryMy underline-offset-2 hover:text-primaryMy'
              >
                Esqueceu sua senha?
              </Link>
            </div>

            <button
              type='submit'
              disabled={loading}
              className='mt-4 min-h-11 w-full rounded-md bg-primaryMy px-4 font-rajdhani-semibold text-lg text-white transition-colors hover:bg-primaryMy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-60'
            >
              {loading ? 'Carregando...' : 'Submeter Login'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default Login;
