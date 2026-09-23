import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { clearSession, readSession } from '@/auth/session';
import AuthFlowShell from '@/components/auth/AuthFlowShell';
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
        notifyError(normalizedError, OPERATION_IDS.changePassword);
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
    <AuthFlowShell
      title={required ? 'Defina uma nova senha' : 'Alterar senha'}
      description={
        required
          ? 'Para continuar, defina uma nova senha para sua conta.'
          : 'Informe sua senha atual e escolha uma nova senha.'
      }
    >
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
          className='min-h-11 rounded-md bg-primaryMy px-4 font-rajdhani-semibold text-lg text-white transition-colors hover:bg-primaryMy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-60'
        >
          {isSubmitting ? 'Salvando...' : 'Alterar senha'}
        </button>
      </form>
    </AuthFlowShell>
  );
}

export default ChangePassword;
