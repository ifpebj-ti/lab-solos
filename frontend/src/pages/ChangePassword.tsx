import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { clearSession, readSession } from '@/auth/session';
import { passwordChangeSchema } from '@/auth/passwordPolicy';
import PasswordChangeFields from '@/components/auth/PasswordChangeFields';
import { Input } from '@/components/ui/input';
import { isApplicationError } from '@/errors/applicationError';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { normalizeError } from '@/errors/normalizeError';
import { notifyError } from '@/errors/presentError';
import { api } from '@/services/BaseApi';

const changePasswordSchema = z.intersection(
  z.object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
  }),
  passwordChangeSchema
);

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

const CHANGE_PASSWORD_FIELDS = new Set<keyof ChangePasswordForm>([
  'currentPassword',
  'newPassword',
  'confirmation',
]);

type ChangePasswordProps = {
  required?: boolean;
};

function ChangePassword({ required = false }: ChangePasswordProps) {
  const navigate = useNavigate();
  const endSession = () => {
    clearSession();
    navigate('/', { replace: true });
  };
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  const submit = async (data: ChangePasswordForm) => {
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
    } catch (error: unknown) {
      const normalizedError = normalizeError(error);
      if (normalizedError.category === 'authentication') {
        if (!isApplicationError(error)) endSession();
        return;
      }

      for (const [field, messages] of Object.entries(
        normalizedError.fieldErrors ?? {}
      )) {
        if (!CHANGE_PASSWORD_FIELDS.has(field as keyof ChangePasswordForm)) {
          continue;
        }

        const message = messages[0];
        if (message) {
          setError(field as keyof ChangePasswordForm, {
            type: 'server',
            message,
          });
        }
      }

      notifyError(normalizedError, OPERATION_IDS.changePassword);
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
        />

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
