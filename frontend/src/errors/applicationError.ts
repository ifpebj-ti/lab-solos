export const ERROR_CATEGORIES = [
  'validation',
  'authentication',
  'authorization',
  'not_found',
  'conflict',
  'network',
  'timeout',
  'server',
  'unknown',
] as const;

export type ErrorCategory = (typeof ERROR_CATEGORIES)[number];

export type ApplicationError = Readonly<{
  name: 'ApplicationError';
  category: ErrorCategory;
  message: string;
  status?: number;
  code?: string;
  requestId?: string;
  fieldErrors?: Readonly<Record<string, readonly string[]>>;
  retryable: boolean;
}>;

const categorySet = new Set<string>(ERROR_CATEGORIES);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const isHttpStatus = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599;

const isRequestId = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= 128 &&
  /^[A-Za-z0-9._:-]+$/.test(value);

const isFieldErrors = (value: unknown): value is ApplicationError['fieldErrors'] => {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;

  return Object.values(value).every(
    (messages) =>
      Array.isArray(messages) &&
      messages.every((message) => typeof message === 'string')
  );
};

export const isApplicationError = (value: unknown): value is ApplicationError => {
  if (!isRecord(value)) return false;

  return (
    value.name === 'ApplicationError' &&
    typeof value.category === 'string' &&
    categorySet.has(value.category) &&
    typeof value.message === 'string' &&
    (value.status === undefined || isHttpStatus(value.status)) &&
    (value.code === undefined || typeof value.code === 'string') &&
    (value.requestId === undefined || isRequestId(value.requestId)) &&
    isFieldErrors(value.fieldErrors) &&
    typeof value.retryable === 'boolean'
  );
};

type ApplicationErrorFields = Omit<ApplicationError, 'name'>;

export const createApplicationError = (
  fields: ApplicationErrorFields
): ApplicationError => {
  const {
    category,
    message,
    status,
    code,
    requestId,
    fieldErrors,
    retryable,
  } = fields;
  const error: ApplicationError = Object.freeze({
    name: 'ApplicationError',
    category,
    message,
    ...(status === undefined ? {} : { status }),
    ...(code === undefined ? {} : { code }),
    ...(requestId === undefined ? {} : { requestId }),
    ...(fieldErrors === undefined ? {} : { fieldErrors }),
    retryable,
  });

  return error;
};
