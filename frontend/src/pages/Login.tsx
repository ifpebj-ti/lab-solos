import InputText from '../components/global/inputs/Text';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../public/images/logo.png';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import InputPassword from '../components/global/inputs/Password';
import { useState } from 'react';
import { authenticate } from '@/integration/Auth';
import { toast } from '../components/hooks/use-toast';

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

  async function postLogin(data: LoginFormData) {
    setLoading(true);
    try {
      authenticate({ method: 'POST', params: data });
      toast({
        title: 'Login bem-sucedido!',
        description: 'Redirecionando para a página inicial...',
      });
      // Redirecionar após sucesso
      setTimeout(() => {
        navigate('/');
      }, 5000);
    } catch (error) {
      console.error('Erro ao autenticar:', error);
      toast({
        title: 'Erro durante o login',
        description: 'Verifique suas credenciais e tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className='h-screen w-full flex justify-center items-center flex-col bg-gradient-to-tr from-[#f4f4f5] to-[#f4f4f5]'>
      <div className='w-96 bg-backgroundMy border border-borderMy rounded-md shadow-lg'>
        <div className='w-full bg-primaryMy h-28 flex items-center justify-start gap-x-2 px-4 rounded-t-[5px]'>
          <img alt='Logo' src={logo} className='w-24' />
          <div className='text-white gap-y-1'>
            <h1 className='font-rajdhani-semibold text-3xl'>Lab-On</h1>
            <p className='font-rajdhani-medium text-base'>
              Gerenciamento de Laboratórios <br /> Químicos Online
            </p>
          </div>
        </div>
        <div className='w-full bg-backgroundMy rounded-b-md p-4 flex items-center flex-col justify-between'>
          <form
            onSubmit={handleSubmit(postLogin)}
            className='w-full gap-y-3 flex flex-col'
          >
            <InputText
              label='Email'
              type='email'
              register={register}
              error={errors.email?.message}
              name='email'
            />
            <InputPassword
              label='Senha'
              register={register}
              error={errors.password?.message}
              name='password'
            />
            <div className='flex gap-x-2 w-full items-center justify-center text-xs font-inter-regular mt-4 mb-1 flex-col'>
              <div className='flex gap-x-1'>
                <p>Não possui conta?</p>
                <Link
                  to={'/createAccount'}
                  className='text-blue-600 hover:text-blue-800'
                >
                  Crie a sua agora. ↗
                </Link>
              </div>
              <Link
                to={'/forgotYourPassword'}
                className='text-blue-600 hover:text-blue-800'
              >
                Esqueceu sua senha? ↗
              </Link>
            </div>
            <button
              type='submit'
              disabled={loading}
              className={`mt-3 mb-3 rounded text-center h-9 w-full font-rajdhani-semibold text-white bg-primaryMy hover:bg-opacity-90`}
            >
              {loading ? 'Carregando...' : 'Submeter Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
