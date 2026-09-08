import {
  isOperationId,
  type OperationId,
} from './errorCatalog';
import { normalizeError } from './normalizeError';
import type { ApplicationError } from './applicationError';

export const reportAppError = (
  error: unknown,
  operation?: OperationId
): ApplicationError => {
  const normalized = normalizeError(error);

  if (import.meta.env.DEV) {
    console.debug('Application error', {
      category: normalized.category,
      status: normalized.status,
      code: normalized.code,
      requestId: normalized.requestId,
      operation: operation && isOperationId(operation) ? operation : undefined,
    });
  }

  return normalized;
};

export default reportAppError;
