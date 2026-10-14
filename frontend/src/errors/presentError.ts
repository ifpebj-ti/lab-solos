import { createElement } from 'react';

import { toast } from '@/components/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

import {
  ERROR_CATALOG,
  getOperationLabel,
  type OperationId,
} from './errorCatalog';
import { type ApplicationError, type ErrorCategory } from './applicationError';
import { normalizeError } from './normalizeError';

export type ErrorPresentation = Readonly<{
  title: string;
  description: string;
  suggestedAction: string;
  requestId?: string;
  retryAfterSeconds?: number;
  fieldErrors?: ApplicationError['fieldErrors'];
  retryable: boolean;
}>;

export type PresentableOperation = OperationId | string;

export interface NotifyErrorOptions {
  onRetry?: () => void;
  onNavigate?: () => void;
  navigateLabel?: string;
}

export const RETRY_ACTION_LABEL = 'Tentar novamente';
export const NAVIGATE_ACTION_LABEL = 'Voltar';
export const AUTHENTICATION_ACTION_LABEL = 'Entrar novamente';

const NAVIGABLE_CATEGORIES = new Set<ErrorCategory>([
  'authentication',
  'authorization',
  'not_found',
]);

export const getNavigationActionLabel = (
  category: ErrorCategory,
  requestedLabel?: string
): string =>
  requestedLabel ??
  (category === 'authentication'
    ? AUTHENTICATION_ACTION_LABEL
    : NAVIGATE_ACTION_LABEL);

const presentationCategories = new WeakMap<
  ErrorPresentation,
  ErrorCategory
>();

export const getPresentationCategory = (
  presentation: ErrorPresentation
): ErrorCategory | undefined => presentationCategories.get(presentation);

export const isNavigableErrorCategory = (category: ErrorCategory): boolean =>
  NAVIGABLE_CATEGORIES.has(category);

export const presentError = (
  error: unknown,
  operation: PresentableOperation
): ErrorPresentation => {
  const normalized = normalizeError(error);
  const catalogEntry = ERROR_CATALOG[normalized.category];
  const suggestedAction =
    normalized.category === 'rate_limited' &&
    normalized.retryAfterSeconds !== undefined
      ? `Aguarde ${normalized.retryAfterSeconds} ${normalized.retryAfterSeconds === 1 ? 'segundo' : 'segundos'} antes de tentar novamente.`
      : catalogEntry.suggestedAction;
  const presentation: ErrorPresentation = Object.freeze({
    title: `Não foi possível ${getOperationLabel(operation)}`,
    description: catalogEntry.message,
    suggestedAction,
    ...(normalized.requestId === undefined
      ? {}
      : { requestId: normalized.requestId }),
    ...(normalized.retryAfterSeconds === undefined
      ? {}
      : { retryAfterSeconds: normalized.retryAfterSeconds }),
    ...(normalized.fieldErrors === undefined
      ? {}
      : { fieldErrors: normalized.fieldErrors }),
    retryable: catalogEntry.retryable,
  });

  presentationCategories.set(presentation, normalized.category);
  return presentation;
};

const getToastDescription = (presentation: ErrorPresentation): string =>
  [
    presentation.description,
    presentation.suggestedAction,
    presentation.requestId
      ? `Código de referência: ${presentation.requestId}`
      : undefined,
  ]
    .filter(Boolean)
    .join(' ');

export const notifyError = (
  error: unknown,
  operation: PresentableOperation,
  options: NotifyErrorOptions = {}
): ErrorPresentation => {
  const presentation = presentError(error, operation);
  const category = getPresentationCategory(presentation);
  const action =
    presentation.retryable && options.onRetry
      ? createElement(
          ToastAction,
          {
            altText: RETRY_ACTION_LABEL,
            onClick: options.onRetry,
          },
          RETRY_ACTION_LABEL
        )
      : category && isNavigableErrorCategory(category) && options.onNavigate
        ? createElement(
            ToastAction,
            {
              altText: getNavigationActionLabel(category, options.navigateLabel),
              onClick: options.onNavigate,
            },
            getNavigationActionLabel(category, options.navigateLabel)
          )
        : undefined;

  toast({
    title: presentation.title,
    description: getToastDescription(presentation),
    variant: 'destructive',
    ...(action === undefined ? {} : { action }),
  });

  return presentation;
};

export default presentError;
