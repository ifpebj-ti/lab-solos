import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, type UseFormSetError } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { clearSession } from '@/auth/session';
import AuthFlowShell from '@/components/auth/AuthFlowShell';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import type { ApplicationError } from '@/errors/applicationError';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { normalizeError } from '@/errors/normalizeError';
import {
  presentError,
  type ErrorPresentation,
} from '@/errors/presentError';
import { requestPasswordReset } from '@/integration/Auth';
import { toast } from '../components/hooks/use-toast';
import InputText from '../components/global/inputs/Text';

const submitForgotPasswordSchema = z.object({
  email: z.string().email('Digite um email v\u00e1lido').toLowerCase(),
});

type ForgotPasswordFormData = z.infer<typeof submitForgotPasswordSchema>;

const FORGOT_PASSWORD_FIELDS = new Set<string>(['email']);

const applyForgotPasswordFieldErrors = (
  fieldErrors: ApplicationError['fieldErrors'],
  setError: UseFormSetError<ForgotPasswordFormData>
) => {
  for (const [field, messages] of Object.entries(fieldErrors ?? {})) {
    if (!FORGOT_PASSWORD_FIELDS.has(field)) continue;

    const message = messages[0];
    if (message) {
      setError(field as keyof ForgotPasswordFormData, {
        type: 'server',
        message,
      });
    }
  }
};

const NEUTRAL_RESET_REQUEST_MESSAGE =
  'Se a conta estiver apta, enviaremos as instru\u00e7\u00f5es.';

function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [errorPresentation, setErrorPresentation] =
    useState<ErrorPresentation>();
  const [retryData, setRetryData] = useState<ForgotPasswordFormData>();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(submitForgotPasswordSchema),
  });
  const navigate = useNavigate();

  async function postForgotPassword(data: ForgotPasswordFormData) {
    setLoading(true);
    setErrorPresentation(undefined);
    setRetryData(data);
    clearErrors();
    try {
      await requestPasswordReset(data);
      toast({
        title: 'Verifique seu e-mail',
        description: NEUTRAL_RESET_REQUEST_MESSAGE,
      });
      navigate('/reset-password');
    } catch (error: unknown) {
      const normalizedError = normalizeError(error);
      applyForgotPasswordFieldErrors(normalizedError.fieldErrors, setError);
      setErrorPresentation(
        presentError(normalizedError, OPERATION_IDS.requestPasswordReset)
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    clearSession();
  }, []);

  return (
    <AuthFlowShell
      title='Recuperar acesso'
      description='Forneça seu e-mail cadastrado para receber as instruções de redefinição de senha.'
    >
      <div className='flex w-full flex-col'>
          {errorPresentation ? (
            <ErrorFeedback
              className='mt-3'
              presentation={errorPresentation}
              onRetry={
                retryData
                  ? () => void postForgotPassword(retryData)
                  : undefined
              }
            />
          ) : null}
          <form
            onSubmit={handleSubmit(postForgotPassword)}
            className='flex w-full flex-col gap-1'
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
              className='mt-4 min-h-11 w-full rounded-md bg-primaryMy px-4 font-rajdhani-semibold text-lg text-white transition-colors hover:bg-primaryMy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-60'
            >
              {loading
                ? 'Enviando...'
                : 'Enviar e-mail de recupera\u00e7\u00e3o'}
            </button>
          </form>
      </div>
    </AuthFlowShell>
  );
}

export default ForgotPassword;
