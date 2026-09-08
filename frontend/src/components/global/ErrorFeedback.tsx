import { useEffect, useId, useMemo, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  getPresentationCategory,
  isNavigableErrorCategory,
  NAVIGATE_ACTION_LABEL,
  RETRY_ACTION_LABEL,
  presentError,
  type ErrorPresentation,
  type PresentableOperation,
} from '@/errors/presentError';

export interface ErrorFeedbackProps {
  presentation?: ErrorPresentation;
  error?: unknown;
  operation?: PresentableOperation;
  operationId?: PresentableOperation;
  onRetry?: () => void;
  onNavigate?: () => void;
  navigateLabel?: string;
  className?: string;
}

function ErrorFeedback({
  presentation,
  error,
  operation,
  operationId,
  onRetry,
  onNavigate,
  navigateLabel = NAVIGATE_ACTION_LABEL,
  className,
}: ErrorFeedbackProps) {
  const feedbackRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const resolvedOperation = operationId ?? operation;
  const resolvedPresentation = useMemo(() => {
    if (presentation) return presentation;
    if (error !== undefined && resolvedOperation !== undefined) {
      return presentError(error, resolvedOperation);
    }
    return undefined;
  }, [error, presentation, resolvedOperation]);

  useEffect(() => {
    feedbackRef.current?.focus();
  }, [resolvedPresentation]);

  if (!resolvedPresentation) return null;

  const category = getPresentationCategory(resolvedPresentation);
  const canNavigate =
    category !== undefined && isNavigableErrorCategory(category);
  const fieldErrors = Object.entries(resolvedPresentation.fieldErrors ?? {})
    .filter(([, messages]) => messages.length > 0)
    .flatMap(([field, messages]) =>
      messages.map((message) => ({ field, message }))
    );

  return (
    <div
      ref={feedbackRef}
      role='alert'
      aria-live='assertive'
      aria-atomic='true'
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      tabIndex={-1}
      className={cn(
        'w-full rounded-md border border-red-300 bg-red-50 p-4 text-red-950',
        className
      )}
    >
      <h2 id={titleId} className='font-semibold'>
        {resolvedPresentation.title}
      </h2>
      <p id={descriptionId} className='mt-1'>
        {resolvedPresentation.description}
      </p>
      <p className='mt-1'>{resolvedPresentation.suggestedAction}</p>

      {fieldErrors.length > 0 ? (
        <ul className='mt-2 list-disc pl-5' aria-label='Campos para revisar'>
          {fieldErrors.map(({ field, message }, index) => (
            <li key={`${field}-${index}`}>
              <span className='font-medium'>{field}</span>: {message}
            </li>
          ))}
        </ul>
      ) : null}

      {resolvedPresentation.requestId ? (
        <p className='mt-2 text-sm'>
          Código de referência: {resolvedPresentation.requestId}
        </p>
      ) : null}

      {((resolvedPresentation.retryable && onRetry) ||
        (canNavigate && onNavigate)) && (
        <div className='mt-3 flex flex-wrap gap-2'>
          {resolvedPresentation.retryable && onRetry ? (
            <Button type='button' onClick={onRetry}>
              {RETRY_ACTION_LABEL}
            </Button>
          ) : null}
          {canNavigate && onNavigate ? (
            <Button type='button' onClick={onNavigate}>
              {navigateLabel}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export { ErrorFeedback };
export default ErrorFeedback;
