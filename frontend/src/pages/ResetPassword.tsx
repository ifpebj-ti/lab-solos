import InputPassword from '../components/global/inputs/Password';
import InputText from '../components/global/inputs/Text';
import { zodResolver } from '@hookform/resolvers/zod';
import logo from '../../public/images/logo.png';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import Cookie from 'js-cookie';
import { toast } from '../components/hooks/use-toast';
import { AxiosError } from 'axios';
import { resetPassword } from '@/integration/Auth'; // ajuste conforme seu path

const submitResetPasswordSchema = z
  .object({
    token: z.string().min(1, 'O token é obrigatório'),
    senha: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
    repeat: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.senha !== data.repeat) {
      ctx.addIssue({
        code: 'custom',
        path: ['repeat'],
        message: 'As senhas não coincidem',
      });
    }
  });

type ResetPasswordFormData = z.infer<typeof submitResetPasswordSchema>;

function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(submitResetPasswordSchema),
  });
  const navigate = useNavigate();

  async function postResetPassword(data: ResetPasswordFormData) {
    setLoading(true);
    try {
      const response = await resetPassword({
        token: data.token,
        novaSenha: data.senha,
      });

      console.log('Payload enviado:', response);

      if (response.status === 200) {
        toast({
          title: 'Senha atualizada!',
          description: 'Você será redirecionado para o login.',
        });

        navigate('/');
      } else {
        toast({
          title: 'Erro ao atualizar senha',
          description: 'Verifique se o token está correto.',
        });
      }
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        toast({
          title: 'Erro na redefinição',
          description: error.response?.data?.message || 'Falha na operação.',
        });
      } else {
        toast({
          title: 'Erro inesperado',
          description: 'Tente novamente mais tarde.',
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
    <div className='h-screen w-full flex justify-center items-center flex-col bg-gradient-to-tr from-[#f4f4f5] to-[#f4f4f5] min-h-screen'>
      <div className='w-96 bg-backgroundMy border border-borderMy rounded-md shadow-lg'>
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
            Digite sua nova senha, repita-a e insira o token que você recebeu
            por e-mail.
          </p>
          <form
            onSubmit={handleSubmit(postResetPassword)}
            className='w-full gap-y-3 flex flex-col mt-2'
          >
            <InputText
              label='Token recebido por e-mail'
              type='text'
              register={register}
              error={errors.token?.message}
              name='token'
            />
            <InputPassword
              label='Nova Senha'
              register={register}
              error={errors.senha?.message}
              name='senha'
            />
            <InputPassword
              label='Confirme sua Nova Senha'
              register={register}
              error={errors.repeat?.message}
              name='repeat'
            />
            <button
              type='submit'
              disabled={loading}
              className='mt-5 mb-3 bg-primaryMy rounded text-center h-9 w-full font-rajdhani-semibold text-white hover:bg-opacity-90'
            >
              {loading ? 'Atualizando...' : 'Atualizar senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
