import type {
  FieldPath,
  FieldValues,
  UseFormSetError,
} from 'react-hook-form';

import type { ApplicationError } from '@/errors/applicationError';

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
