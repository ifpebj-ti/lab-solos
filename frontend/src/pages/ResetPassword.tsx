import InputPassword from '../components/global/inputs/Password';
import { zodResolver } from '@hookform/resolvers/zod';
import logo from '../../public/images/logo.png';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEffect } from 'react';
import Cookie from 'js-cookie';

const submitResetPasswordSchema = z
  .object({
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(submitResetPasswordSchema),
  });
  const navigate = useNavigate();

  function postResetPassword() {
    navigate('/');
  }

  useEffect(() => {
    Cookie.remove('rankID');
    Cookie.remove('doorKey');
    Cookie.remove('level');
  }, []);

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
          <p className='font-inter-regular text-clt-2'>
            Digite sua nova senha e confirme no segundo campo para concluir a
            redefinição.
          </p>
          <form
            onSubmit={handleSubmit(postResetPassword)}
            className='w-full gap-y-3 flex flex-col mt-2'
          >
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
              className='mt-5 mb-3 bg-primaryMy rounded text-center h-9 w-full font-rajdhani-semibold text-white hover:bg-opacity-90'
            >
              Atualizar senha
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
