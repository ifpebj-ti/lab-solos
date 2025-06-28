import InputText from '../components/global/inputs/Text';
import { zodResolver } from '@hookform/resolvers/zod';
import logo from '../../public/images/logo.png';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import Cookie from 'js-cookie';
import { AxiosError } from 'axios';
import { toast } from '../components/hooks/use-toast';
import { requestPasswordReset } from '@/integration/Auth'; // ajuste o caminho conforme sua estrutura
import { useNavigate } from 'react-router-dom';

const submitForgotPasswordSchema = z.object({
  email: z.string().email('Digite um email válido').toLowerCase(),
});

type ForgotPasswordFormData = z.infer<typeof submitForgotPasswordSchema>;

function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(submitForgotPasswordSchema),
  });
  const navigate = useNavigate();

  async function postForgotPassword(data: ForgotPasswordFormData) {
    setLoading(true);
    try {
      const response = await requestPasswordReset(data);

      if (response.status === 200) {
        toast({
          title: 'E-mail enviado!',
          description: 'Verifique sua caixa de entrada.',
        });
        // Redireciona para a tela de redefinição
        navigate('/reset-password');
      } else {
        toast({
          title: 'Erro ao enviar e-mail',
          description: 'Tente novamente mais tarde.',
        });
      }
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        toast({
          title: 'Humm... Não encontramos esse e-mail.',
          description:
            error.response?.data?.message ||
            'Verifique o e-mail digitado e tente novamente.',
        });
      } else {
        toast({
          title: 'Erro inesperado',
          description: 'Algo deu errado. Tente novamente.',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Cookie.remove('rankID');
    Cookie.remove('doorKey');
    Cookie.remove('level');
  }, []);

  return (
    <div className='h-screen w-full flex justify-center items-center flex-col bg-gradient-to-tr from-[#f4f4f5] to-[#f4f4f5]'>
      <div className='w-96 bg-backgroundMy border-[1px] border-borderMy rounded-md shadow-lg'>
        <div className='w-full bg-primaryMy h-28 flex items-center justify-start gap-x-2 px-4 rounded-t-[5px]'>
          <img alt='Logo' src={logo} className='w-24' />
          <div className='text-white gap-y-1'>
            <h1 className='font-rajdhani-semibold text-3xl'>LabOn</h1>
            <p className='font-rajdhani-medium text-base'>
              Gerenciamento de Laboratórios <br /> Químicos Online
            </p>
          </div>
        </div>
        <div className='w-full bg-backgroundMy rounded-b-md p-4 flex items-center flex-col justify-between'>
          <p className='font-inter-regular text-clt-2'>
            Forneça seu e-mail cadastrado para receber um link de redefinição de senha.
          </p>
          <form
            onSubmit={handleSubmit(postForgotPassword)}
            className='w-full gap-y-3 flex flex-col'
          >
            <InputText
              label='Email'
              type='email'
              register={register}
              error={errors.email?.message}
              name='email'
            />
            <button
              type='submit'
              disabled={loading}
              className='mt-4 mb-3 bg-primaryMy rounded text-center h-9 w-full font-rajdhani-semibold text-white hover:bg-opacity-90'
            >
              {loading ? 'Enviando...' : 'Enviar e-mail de recuperação'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
