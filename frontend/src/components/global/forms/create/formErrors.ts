import type {
  FieldPath,
  FieldValues,
  UseFormSetError,
} from 'react-hook-form';

import {
  isApplicationError,
  type ApplicationError,
  type ProductExpiryConfirmationData,
} from '@/errors/applicationError';

export const readProductExpiryConfirmation = (
  error: unknown
): ProductExpiryConfirmationData | undefined => {
  if (
    !isApplicationError(error) ||
    error.code !== 'product_expiration_confirmation_required'
  ) {
    return undefined;
  }

  return error.productExpiryConfirmation;
};

export const applyRecognizedFieldErrors = <TFieldValues extends FieldValues>(
  fieldErrors: ApplicationError['fieldErrors'],
  fields: ReadonlySet<string>,
  setError: UseFormSetError<TFieldValues>
): void => {
  let shouldFocus = true;

  for (const [field, messages] of Object.entries(fieldErrors ?? {})) {
    const message = messages[0];
    if (!fields.has(field) || !message) continue;

    setError(
      field as FieldPath<TFieldValues>,
      { type: 'server', message },
      { shouldFocus }
    );
    shouldFocus = false;
  }
};
