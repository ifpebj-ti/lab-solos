import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { clearSession, readSession } from '@/auth/session';
import { passwordChangeSchema } from '@/auth/passwordPolicy';
import PasswordChangeFields from '@/components/auth/PasswordChangeFields';
import { Input } from '@/components/ui/input';
import { api } from '@/services/BaseApi';

const changePasswordSchema = z.intersection(
  z.object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
  }),
  passwordChangeSchema
);

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

type ChangePasswordProps = {
  required?: boolean;
};

const readErrorResponse = (error: unknown): object | undefined => {
  if (!error || typeof error !== 'object') return undefined;

  const response = Reflect.get(error, 'response');
  return response && typeof response === 'object' ? response : undefined;
};

const readProblemCode = (error: unknown): string | undefined => {
  const response = readErrorResponse(error);
  if (!response) return undefined;

  const data = Reflect.get(response, 'data');
  if (!data || typeof data !== 'object') return undefined;

  const directCode = Reflect.get(data, 'code');
  if (typeof directCode === 'string') return directCode;

  const errors = Reflect.get(data, 'errors');
  if (!errors || typeof errors !== 'object') return undefined;

  for (const values of Object.values(errors)) {
    if (!Array.isArray(values)) continue;
    const code = values.find((value) => typeof value === 'string');
    if (typeof code === 'string') return code;
  }

  return undefined;
};

const readResponseStatus = (error: unknown): number | undefined => {
  const response = readErrorResponse(error);
  if (!response) return undefined;
  const status = Reflect.get(response, 'status');
  return typeof status === 'number' ? status : undefined;
};

function ChangePassword({ required = false }: ChangePasswordProps) {
  const navigate = useNavigate();
  const [serverErrorCode, setServerErrorCode] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const endSession = () => {
    clearSession();
    navigate('/', { replace: true });
  };
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  const submit = async (data: ChangePasswordForm) => {
    setServerErrorCode(undefined);
    setSubmitError(undefined);

    try {
      const session = readSession();
      if (!session) {
        endSession();
        return;
      }

      await api.post('Auth/change-password', data, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      endSession();
    } catch (error) {
      const status = readResponseStatus(error);
      if (status === 401 || status === 409) {
        endSession();
        return;
      }

      const code = readProblemCode(error);
      if (code) {
        setServerErrorCode(code);
        return;
      }

      setSubmitError('Não foi possível alterar a senha. Tente novamente.');
    }
  };

  return (
    <section className='mx-auto flex w-full max-w-md flex-col gap-6 p-6'>
      <header>
        <h1 className='text-3xl font-bold'>
          {required ? 'Defina uma nova senha' : 'Alterar senha'}
        </h1>
        <p className='text-muted-foreground'>
          {required
            ? 'Para continuar, defina uma nova senha para sua conta.'
            : 'Informe sua senha atual e escolha uma nova senha.'}
        </p>
      </header>

      <form className='flex flex-col gap-4' onSubmit={handleSubmit(submit)}>
        <div className='flex flex-col gap-1'>
          <label htmlFor='current-password'>Senha atual</label>
          <Input
            {...register('currentPassword')}
            id='current-password'
            type='password'
            autoComplete='current-password'
            aria-invalid={errors.currentPassword ? true : undefined}
          />
          {errors.currentPassword?.message ? (
            <p role='alert' className='text-xs text-red-500'>
              {errors.currentPassword.message}
            </p>
          ) : null}
        </div>

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
          disabled={isSubmitting}
          className='rounded bg-primaryMy px-4 py-2 font-semibold text-white'
        >
          {isSubmitting ? 'Salvando...' : 'Alterar senha'}
        </button>
      </form>
    </section>
  );
}

export default ChangePassword;
