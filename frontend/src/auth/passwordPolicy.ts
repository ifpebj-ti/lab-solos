import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_REQUIREMENTS_MESSAGE = `Use entre ${PASSWORD_MIN_LENGTH} e ${PASSWORD_MAX_LENGTH} caracteres.`;

const PASSWORD_ERROR_MESSAGES = {
  password_required: 'Informe a nova senha.',
  password_too_short: `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  password_too_long: `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`,
  password_common: 'Esta senha é muito comum. Escolha outra.',
  password_confirmation_mismatch: 'A confirmação da senha não corresponde.',
  current_password_invalid: 'A senha atual está incorreta.',
} as const;

const UNKNOWN_PASSWORD_ERROR_MESSAGE =
  'Não foi possível validar a senha. Tente novamente.';

export type PasswordErrorCode = keyof typeof PASSWORD_ERROR_MESSAGES;

const passwordSchema = z.string().superRefine((password, context) => {
  const length = Array.from(password).length;

  if (length === 0) {
    context.addIssue({
      code: 'custom',
      message: PASSWORD_ERROR_MESSAGES.password_required,
    });
    return;
  }

  if (length < PASSWORD_MIN_LENGTH) {
    context.addIssue({
      code: 'custom',
      message: PASSWORD_ERROR_MESSAGES.password_too_short,
    });
  }

  if (length > PASSWORD_MAX_LENGTH) {
    context.addIssue({
      code: 'custom',
      message: PASSWORD_ERROR_MESSAGES.password_too_long,
    });
  }
});

export const passwordChangeSchema = z
  .object({
    newPassword: passwordSchema,
    confirmation: z.string(),
  })
  .superRefine(({ newPassword, confirmation }, context) => {
    if (newPassword !== confirmation) {
      context.addIssue({
        code: 'custom',
        message: PASSWORD_ERROR_MESSAGES.password_confirmation_mismatch,
        path: ['confirmation'],
      });
    }
  });

export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;

export const getPasswordErrorMessage = (code: unknown): string => {
  if (
    typeof code === 'string' &&
    Object.prototype.hasOwnProperty.call(PASSWORD_ERROR_MESSAGES, code)
  ) {
    return PASSWORD_ERROR_MESSAGES[code as PasswordErrorCode];
  }

  return UNKNOWN_PASSWORD_ERROR_MESSAGE;
};
