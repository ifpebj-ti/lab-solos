import { useLayoutEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeError } from '@/errors/normalizeError';
import { updateOwnUserProfile } from '@/integration/Users';
import type { UsuarioComum } from '@/contracts/user';

export type ProfileContactFields = Pick<
  UsuarioComum,
  'nomeCompleto' | 'email' | 'telefone'
>;

type ProfileContactFormProps = {
  user: Pick<UsuarioComum, 'id' | 'nomeCompleto' | 'email' | 'telefone'>;
  onSaved: (fields: ProfileContactFields) => void | Promise<void>;
  onCancel: () => void;
};

const feedbackForError = (error: unknown): string => {
  const normalized = normalizeError(error);
  if (normalized.code === 'current_password_invalid') {
    return 'A senha atual está incorreta. O perfil não foi alterado.';
  }
  if (
    normalized.status === 409 ||
    normalized.code === 'profile_update_conflict'
  ) {
    return 'Este e-mail já está em uso. Os dados do perfil não foram alterados.';
  }
  if (normalized.status === 400) {
    return 'Não foi possível atualizar o perfil. Revise os dados e tente novamente.';
  }
  return 'Não foi possível atualizar o perfil. Tente novamente.';
};

function ProfileContactForm({ user, onSaved, onCancel }: ProfileContactFormProps) {
  const [nomeCompleto, setNomeCompleto] = useState(user.nomeCompleto);
  const [email, setEmail] = useState(user.email);
  const [telefone, setTelefone] = useState(user.telefone ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const passwordInput = useRef<HTMLInputElement>(null);
  const passwordValue = useRef('');
  const emailChanged = email !== user.email;
  const telefoneValue = telefone === '' ? null : telefone;
  const hasChanges =
    nomeCompleto !== user.nomeCompleto ||
    emailChanged ||
    telefoneValue !== user.telefone;

  const clearCurrentPassword = () => {
    passwordValue.current = '';
    if (passwordInput.current) passwordInput.current.value = '';
  };

  useLayoutEffect(
    () => () => {
      clearCurrentPassword();
    },
    []
  );

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value === user.email) clearCurrentPassword();
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(undefined);
    setSuccessMessage(undefined);

    if (!hasChanges || submitting) return;
    if (emailChanged && passwordValue.current.length === 0) {
      setErrorMessage('Informe sua senha atual para alterar o e-mail.');
      passwordInput.current?.focus();
      return;
    }

    const updatedFields: ProfileContactFields = {
      nomeCompleto,
      email,
      telefone: telefoneValue,
    };

    setSubmitting(true);
    try {
      await updateOwnUserProfile({
        userId: user.id,
        currentName: user.nomeCompleto,
        currentEmail: user.email,
        currentPhone: user.telefone,
        nomeCompleto,
        email,
        telefone: telefoneValue,
        ...(emailChanged ? { currentPassword: passwordValue.current } : {}),
      });
      clearCurrentPassword();
      await onSaved(updatedFields);
      setSuccessMessage('Perfil atualizado.');
    } catch (error) {
      setErrorMessage(feedbackForError(error));
    } finally {
      clearCurrentPassword();
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    clearCurrentPassword();
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    setNomeCompleto(user.nomeCompleto);
    setEmail(user.email);
    setTelefone(user.telefone ?? '');
    onCancel();
  };

  return (
    <form
      aria-label='Editar meu perfil'
      onSubmit={handleSubmit}
      className='grid w-full gap-4 rounded-xl border border-borderMy bg-surface p-4 shadow-xs'
    >
      <h2 className='font-rajdhani-medium text-xl text-clt-2'>
        Editar meus dados
      </h2>
      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='grid gap-2'>
          <label htmlFor='profile-name'>Nome completo</label>
          <Input
            id='profile-name'
            autoComplete='name'
            required
            value={nomeCompleto}
            onChange={(event) => {
              setNomeCompleto(event.target.value);
              setErrorMessage(undefined);
              setSuccessMessage(undefined);
            }}
          />
        </div>
        <div className='grid gap-2'>
          <label htmlFor='profile-email'>E-mail</label>
          <Input
            id='profile-email'
            type='email'
            autoComplete='email'
            required
            maxLength={254}
            value={email}
            onChange={(event) => handleEmailChange(event.target.value)}
          />
        </div>
        <div className='grid gap-2'>
          <label htmlFor='profile-phone'>Telefone</label>
          <Input
            id='profile-phone'
            type='tel'
            autoComplete='tel'
            value={telefone}
            onChange={(event) => {
              setTelefone(event.target.value);
              setErrorMessage(undefined);
              setSuccessMessage(undefined);
            }}
          />
        </div>
        {emailChanged ? (
          <div className='grid gap-2'>
            <label htmlFor='profile-current-password'>Senha atual</label>
            <Input
              ref={passwordInput}
              id='profile-current-password'
              type='password'
              autoComplete='current-password'
              required
              onChange={(event) => {
                passwordValue.current = event.target.value;
                setErrorMessage(undefined);
              }}
            />
          </div>
        ) : null}
      </div>
      {errorMessage ? (
        <p role='alert' className='text-sm text-danger'>
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p role='status' className='text-sm text-clt-2'>
          {successMessage}
        </p>
      ) : null}
      <div className='flex flex-wrap gap-3'>
        <Button type='submit' disabled={!hasChanges || submitting}>
          {submitting ? 'Salvando...' : 'Salvar alterações'}
        </Button>
        <Button
          type='button'
          variant='outline'
          disabled={submitting}
          onClick={handleCancel}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export default ProfileContactForm;
