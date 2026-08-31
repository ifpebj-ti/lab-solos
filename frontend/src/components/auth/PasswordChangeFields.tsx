import type { InputHTMLAttributes } from 'react';

import {
  getPasswordErrorMessage,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from '@/auth/passwordPolicy';
import { Input } from '@/components/ui/input';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export interface PasswordChangeFieldsProps {
  newPasswordInputProps?: PasswordInputProps;
  confirmationInputProps?: PasswordInputProps;
  newPasswordError?: string;
  confirmationError?: string;
  serverErrorCode?: string;
}

function PasswordChangeFields({
  newPasswordInputProps = {},
  confirmationInputProps = {},
  newPasswordError,
  confirmationError,
  serverErrorCode,
}: PasswordChangeFieldsProps) {
  const newPasswordId = newPasswordInputProps.id ?? 'new-password';
  const confirmationId = confirmationInputProps.id ?? 'password-confirmation';
  const requirementsId = `${newPasswordId}-requirements`;
  const newPasswordErrorId = `${newPasswordId}-error`;
  const confirmationErrorId = `${confirmationId}-error`;
  const newPasswordDescription = [
    newPasswordInputProps['aria-describedby'],
    requirementsId,
    newPasswordError ? newPasswordErrorId : undefined,
  ]
    .filter(Boolean)
    .join(' ');
  const confirmationDescription = [
    confirmationInputProps['aria-describedby'],
    confirmationError ? confirmationErrorId : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className='flex w-full flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <label htmlFor={newPasswordId}>Nova senha</label>
        <Input
          {...newPasswordInputProps}
          id={newPasswordId}
          name={newPasswordInputProps.name ?? 'newPassword'}
          type='password'
          autoComplete={newPasswordInputProps.autoComplete ?? 'new-password'}
          aria-describedby={newPasswordDescription}
          aria-invalid={
            newPasswordError ? true : newPasswordInputProps['aria-invalid']
          }
        />
        <p id={requirementsId} className='text-xs text-muted-foreground'>
          {PASSWORD_REQUIREMENTS_MESSAGE}
        </p>
        {newPasswordError ? (
          <p
            id={newPasswordErrorId}
            role='alert'
            className='text-xs text-red-500'
          >
            {newPasswordError}
          </p>
        ) : null}
      </div>

      <div className='flex flex-col gap-1'>
        <label htmlFor={confirmationId}>Confirme a nova senha</label>
        <Input
          {...confirmationInputProps}
          id={confirmationId}
          name={confirmationInputProps.name ?? 'confirmation'}
          type='password'
          autoComplete={confirmationInputProps.autoComplete ?? 'new-password'}
          aria-describedby={confirmationDescription || undefined}
          aria-invalid={
            confirmationError ? true : confirmationInputProps['aria-invalid']
          }
        />
        {confirmationError ? (
          <p
            id={confirmationErrorId}
            role='alert'
            className='text-xs text-red-500'
          >
            {confirmationError}
          </p>
        ) : null}
      </div>

      {serverErrorCode ? (
        <p role='alert' className='text-xs text-red-500'>
          {getPasswordErrorMessage(serverErrorCode)}
        </p>
      ) : null}
    </div>
  );
}

export default PasswordChangeFields;
