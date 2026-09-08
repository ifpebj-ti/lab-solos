import { isAxiosError } from 'axios';

import {
  createApplicationError,
  isApplicationError,
  type ApplicationError,
  type ErrorCategory,
} from './applicationError';
import {
  ERROR_CATALOG,
  getFieldErrorMessage,
  isKnownErrorCode,
  normalizeErrorField,
  type KnownErrorCode,
} from './errorCatalog';

type UnknownRecord = Record<string, unknown>;

const PROBLEM_DETAILS_KEYS = new Set([
  'type',
  'title',
  'status',
  'detail',
  'code',
  'traceId',
  'errors',
  'ModelState',
]);

const isRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value) && typeof value === 'object';

const read = (record: UnknownRecord | undefined, key: string): unknown =>
  record ? record[key] : undefined;

const isHttpStatus = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599;

const categoryForStatus = (status: number): ErrorCategory => {
  if (status === 400 || status === 422) return 'validation';
  if (status === 401) return 'authentication';
  if (status === 403) return 'authorization';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status >= 500 && status <= 599) return 'server';
  return 'unknown';
};

const isAxiosLike = (value: unknown, record: UnknownRecord | undefined): boolean =>
  isAxiosError(value) || read(record, 'isAxiosError') === true;

const categoryForRejection = (
  status: number | undefined,
  error: unknown,
  record: UnknownRecord | undefined,
  response: UnknownRecord | undefined
): ErrorCategory => {
  if (status !== undefined) return categoryForStatus(status);

  const errorCode = read(record, 'code');
  if (errorCode === 'ECONNABORTED' || errorCode === 'ETIMEDOUT') {
    return 'timeout';
  }

  if (isAxiosLike(error, record) && response === undefined) return 'network';
  return 'unknown';
};

const firstKnownCode = (values: unknown[]): KnownErrorCode | undefined => {
  for (const value of values) {
    if (isKnownErrorCode(value)) return value;
  }
  return undefined;
};

const codeFromValidationValue = (value: unknown): KnownErrorCode | undefined => {
  if (Array.isArray(value)) return firstKnownCode(value);
  if (!isRecord(value)) return undefined;
  return firstKnownCode([read(value, 'code')]);
};

const validationEntries = (
  body: UnknownRecord | undefined
): UnknownRecord | undefined => {
  if (!body) return undefined;

  const errors = read(body, 'errors');
  if (isRecord(errors)) return errors;

  const modelState = read(body, 'ModelState');
  if (isRecord(modelState)) return modelState;

  return body;
};

const extractFieldErrors = (
  body: UnknownRecord | undefined
): Readonly<Record<string, readonly string[]>> | undefined => {
  const entries = validationEntries(body);
  if (!entries) return undefined;

  const fieldErrors: Record<string, readonly string[]> = {};
  const isProblemDetailsBody = entries === body;
  for (const sourceField of Object.keys(entries)) {
    if (isProblemDetailsBody && PROBLEM_DETAILS_KEYS.has(sourceField)) continue;
    const field = normalizeErrorField(sourceField);
    if (!field) continue;

    const value = read(entries, sourceField);
    const code = codeFromValidationValue(value);
    const message = getFieldErrorMessage(field, code);
    if (message) fieldErrors[field] = Object.freeze([message]);
  }

  return Object.keys(fieldErrors).length > 0
    ? Object.freeze(fieldErrors)
    : undefined;
};

const requestIdFromCandidate = (value: unknown): string | undefined => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 128 ||
    !/^[A-Za-z0-9._:-]+$/.test(value)
  ) {
    return undefined;
  }

  return value;
};

const readHeader = (
  headers: UnknownRecord | undefined,
  name: string
): unknown => {
  if (!headers) return undefined;

  const get = read(headers, 'get');
  if (typeof get === 'function') {
    const value = get.call(headers, name);
    if (value !== undefined) return value;
  }

  const headerName = Object.keys(headers).find(
    (key) => key.toLowerCase() === name
  );
  return headerName ? read(headers, headerName) : undefined;
};

const extractRequestId = (
  body: UnknownRecord | undefined,
  response: UnknownRecord | undefined
): string | undefined => {
  const headers = isRecord(read(response, 'headers'))
    ? (read(response, 'headers') as UnknownRecord)
    : undefined;

  const candidates = [
    read(body, 'traceId'),
    readHeader(headers, 'x-correlation-id'),
    readHeader(headers, 'x-request-id'),
  ];

  return candidates.map(requestIdFromCandidate).find(
    (candidate): candidate is string => candidate !== undefined
  );
};

const extractStatus = (
  record: UnknownRecord | undefined,
  response: UnknownRecord | undefined
): number | undefined => {
  const responseStatus = read(response, 'status');
  if (isHttpStatus(responseStatus)) return responseStatus;
  if (response !== undefined) return undefined;

  const status = read(record, 'status');
  return isHttpStatus(status) ? status : undefined;
};

const extractBody = (
  record: UnknownRecord | undefined,
  response: UnknownRecord | undefined
): UnknownRecord | undefined => {
  const data = response !== undefined ? read(response, 'data') : read(record, 'data');
  if (isRecord(data)) return data;
  if (response === undefined && record) return record;
  return undefined;
};

const normalizeUnknown = (): ApplicationError =>
  createApplicationError({
    category: 'unknown',
    message: ERROR_CATALOG.unknown.message,
    retryable: ERROR_CATALOG.unknown.retryable,
  });

export const normalizeError = (error: unknown): ApplicationError => {
  try {
    if (isApplicationError(error)) return error;

    const record = isRecord(error) ? error : undefined;
    const responseValue = read(record, 'response');
    const response = isRecord(responseValue) ? responseValue : undefined;
    const status = extractStatus(record, response);
    const body = extractBody(record, response);
    const category = categoryForRejection(status, error, record, response);
    const code = firstKnownCode([
      read(body, 'code'),
      read(record, 'code'),
      ...(body ? Object.values(validationEntries(body) ?? {}).map(codeFromValidationValue) : []),
    ]);
    const fieldErrors = category === 'validation' ? extractFieldErrors(body) : undefined;
    const requestId = extractRequestId(body, response);
    const catalogEntry = ERROR_CATALOG[category];

    return createApplicationError({
      category,
      message: catalogEntry.message,
      retryable: catalogEntry.retryable,
      ...(status === undefined ? {} : { status }),
      ...(code === undefined ? {} : { code }),
      ...(requestId === undefined ? {} : { requestId }),
      ...(fieldErrors === undefined ? {} : { fieldErrors }),
    });
  } catch {
    return normalizeUnknown();
  }
};

export default normalizeError;
