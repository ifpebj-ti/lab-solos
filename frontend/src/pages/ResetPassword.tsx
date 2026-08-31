import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { passwordChangeSchema } from '@/auth/passwordPolicy';
import { clearSession } from '@/auth/session';
import PasswordChangeFields from '@/components/auth/PasswordChangeFields';
import { resetPassword } from '@/integration/Auth';
import logo from '../../public/images/logo.png';
import { toast } from '../components/hooks/use-toast';
import InputText from '../components/global/inputs/Text';

const submitResetPasswordSchema = z.intersection(
  z.object({
    email: z.string().email('Digite um email v\u00e1lido').toLowerCase(),
    token: z.string().min(1, 'O token \u00e9 obrigat\u00f3rio'),
  }),
  passwordChangeSchema
);

type ResetPasswordFormData = z.infer<typeof submitResetPasswordSchema>;

const isRecord = (value: unknown): value is Record<PropertyKey, unknown> =>
  Boolean(value) && typeof value === 'object';

const readProblemCode = (error: unknown): string | undefined => {
  if (!isRecord(error)) return undefined;

  const response = error.response;
  if (!isRecord(response)) return undefined;

  const data = response.data;
  if (!isRecord(data)) return undefined;

  const directCode = data.code;
  if (typeof directCode === 'string') return directCode;

  const errors = data.errors;
  if (!isRecord(errors)) return undefined;

  for (const values of Object.values(errors)) {
    if (!Array.isArray(values)) continue;
    const code = values.find((value) => typeof value === 'string');
    if (typeof code === 'string') return code;
  }

  return undefined;
};

const clearResetSession = () => clearSession();

function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const [serverErrorCode, setServerErrorCode] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
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
    setServerErrorCode(undefined);
    setSubmitError(undefined);

    try {
      await resetPassword({
        email: data.email,
        token: data.token,
        newPassword: data.newPassword,
        confirmation: data.confirmation,
      });
      clearResetSession();
      toast({
        title: 'Senha atualizada!',
        description: 'Fa\u00e7a login com sua nova senha.',
      });
      navigate('/', { replace: true });
    } catch (error) {
      const code = readProblemCode(error);
      if (code) {
        setServerErrorCode(code);
      } else {
        setSubmitError('N\u00e3o foi poss\u00edvel redefinir a senha. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    clearResetSession();
  }, []);

  return (
    <div className='h-screen w-full flex justify-center items-center flex-col bg-gradient-to-tr from-[#f4f4f5] to-[#f4f4f5] min-h-screen'>
      <div className='w-96 bg-backgroundMy border border-borderMy rounded-md shadow-lg'>
        <div className='w-full bg-primaryMy h-28 flex items-center justify-start gap-x-2 px-4 rounded-t-[5px]'>
          <img alt='Logo' src={logo} className='w-24' />
          <div className='text-white gap-y-1'>
            <h1 className='font-rajdhani-semibold text-3xl'>LabOn</h1>
            <p className='font-rajdhani-medium text-base'>
              {'Gerenciamento de Laborat\u00f3rios '} <br />
              {' Qu\u00edmicos Online'}
            </p>
          </div>
        </div>
        <div className='w-full bg-backgroundMy rounded-b-md p-4 flex items-center flex-col justify-between'>
          <p className='font-inter-regular text-clt-2'>
            {
              'Digite seu e-mail, a nova senha e o c\u00f3digo que voc\u00ea recebeu por e-mail.'
            }
          </p>
          <form
            onSubmit={handleSubmit(postResetPassword)}
            className='w-full gap-y-3 flex flex-col mt-2'
          >
            <InputText
              label='Email'
              type='email'
              register={register}
              error={errors.email?.message}
              name='email'
            />
            <InputText
              label='Token recebido por e-mail'
              type='text'
              register={register}
              error={errors.token?.message}
              name='token'
            />
            <PasswordChangeFields
              newPasswordInputProps={register('newPassword')}
              confirmationInputProps={register('confirmation')}
              newPasswordError={errors.newPassword?.message}
              confirmationError={errors.confirmation?.message}
              serverErrorCode={serverErrorCode}
            />
            {submitError ? (
              <p role='alert' className='text-xs text-red-500'>
                {submitError}
              </p>
            ) : null}
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
