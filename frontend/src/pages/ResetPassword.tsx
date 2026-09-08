import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, type UseFormSetError } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { passwordChangeSchema } from '@/auth/passwordPolicy';
import { clearSession } from '@/auth/session';
import PasswordChangeFields from '@/components/auth/PasswordChangeFields';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import type { ApplicationError } from '@/errors/applicationError';
import { resetPassword } from '@/integration/Auth';
import logo from '../../public/images/logo.png';
import InputText from '../components/global/inputs/Text';
import { toast } from '../components/hooks/use-toast';
import { OPERATION_IDS, getFieldErrorMessage } from '@/errors/errorCatalog';
import { normalizeError } from '@/errors/normalizeError';
import {
  presentError,
  type ErrorPresentation,
} from '@/errors/presentError';

const submitResetPasswordSchema = z.intersection(
  z.object({
    email: z.string().email('Digite um email v\u00e1lido').toLowerCase(),
    token: z.string().min(1, 'O token \u00e9 obrigat\u00f3rio'),
  }),
  passwordChangeSchema
);

type ResetPasswordFormData = z.infer<typeof submitResetPasswordSchema>;

const RESET_PASSWORD_FIELDS = new Set<string>([
  'email',
  'token',
  'newPassword',
  'confirmation',
]);

const applyResetPasswordFieldErrors = (
  error: ApplicationError,
  setError: UseFormSetError<ResetPasswordFormData>
) => {
  for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) {
    if (!RESET_PASSWORD_FIELDS.has(field)) continue;

    const message = messages[0];
    if (message) {
      setError(field as keyof ResetPasswordFormData, {
        type: 'server',
        message,
      });
    }
  }

  if (
    error.code === 'password_reset_invalid' &&
    error.fieldErrors?.token === undefined
  ) {
    const tokenMessage = getFieldErrorMessage('token', error.code);
    if (tokenMessage) {
      setError('token', { type: 'server', message: tokenMessage });
    }
  }
};

const clearResetSession = () => clearSession();

function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const [errorPresentation, setErrorPresentation] =
    useState<ErrorPresentation>();
  const [retryData, setRetryData] = useState<ResetPasswordFormData>();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(submitResetPasswordSchema),
  });
  const navigate = useNavigate();

  async function postResetPassword(data: ResetPasswordFormData) {
    setLoading(true);
    setErrorPresentation(undefined);
    setRetryData(data);
    clearErrors();

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
    } catch (error: unknown) {
      const normalizedError = normalizeError(error);
      applyResetPasswordFieldErrors(normalizedError, setError);

      setErrorPresentation(
        presentError(normalizedError, OPERATION_IDS.resetPassword)
      );
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
          {errorPresentation ? (
            <ErrorFeedback
              className='mt-3'
              presentation={errorPresentation}
              onRetry={
                retryData
                  ? () => void postResetPassword(retryData)
                  : undefined
              }
            />
          ) : null}
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
