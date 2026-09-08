import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, type UseFormSetError } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { clearSession } from '@/auth/session';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import type { ApplicationError } from '@/errors/applicationError';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { normalizeError } from '@/errors/normalizeError';
import {
  presentError,
  type ErrorPresentation,
} from '@/errors/presentError';
import { requestPasswordReset } from '@/integration/Auth';
import logo from '../../public/images/logo.png';
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
    <div className='h-screen w-full flex justify-center items-center flex-col bg-gradient-to-tr from-[#f4f4f5] to-[#f4f4f5]'>
      <div className='w-96 bg-backgroundMy border-[1px] border-borderMy rounded-md shadow-lg'>
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
              'Forne\u00e7a seu e-mail cadastrado para receber as instru\u00e7\u00f5es de redefini\u00e7\u00e3o de senha.'
            }
          </p>
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
              {loading
                ? 'Enviando...'
                : 'Enviar e-mail de recupera\u00e7\u00e3o'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
