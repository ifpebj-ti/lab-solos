import InputText from '../components/global/inputs/Text';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../public/images/logo.png';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import InputPassword from '../components/global/inputs/Password';

const submitLoginSchema = z.object({
  email: z.string().email('Digite um email válido').toLowerCase(),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

type LoginFormData = z.infer<typeof submitLoginSchema>;

function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(submitLoginSchema),
  });
  const navigate = useNavigate();

  function postLogin() {
    navigate('/');
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
              className='mt-3 mb-3 bg-primaryMy rounded text-center h-9 w-full font-rajdhani-semibold text-white hover:bg-opacity-90'
            >
              Submeter Login
            </button>
          </form>
        </div>
      </div>
      {/* {output && (
                <pre className="mt-4 p-2 text-sm text-gray-700 bg-gray-100 rounded-md">
                    {output}
                </pre>
            )} */}
    </div>
  );
}

export default Login;
