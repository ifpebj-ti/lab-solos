import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, type UseFormSetError } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { passwordChangeSchema } from '@/auth/passwordPolicy';
import { clearSession } from '@/auth/session';
import AuthFlowShell from '@/components/auth/AuthFlowShell';
import PasswordChangeFields from '@/components/auth/PasswordChangeFields';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import type { ApplicationError } from '@/errors/applicationError';
import { resetPassword } from '@/integration/Auth';
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
    <AuthFlowShell
      title='Redefinir senha'
      description='Digite seu e-mail, a nova senha e o código que você recebeu por e-mail.'
    >
      <div className='flex w-full flex-col'>
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
            className='flex w-full flex-col gap-1'
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
              className='mt-4 min-h-11 w-full rounded-md bg-primaryMy px-4 font-rajdhani-semibold text-lg text-white transition-colors hover:bg-primaryMy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-60'
            >
              {loading ? 'Atualizando...' : 'Atualizar senha'}
            </button>
          </form>
      </div>
    </AuthFlowShell>
  );
}

export default ResetPassword;
