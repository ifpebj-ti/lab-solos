import { useCallback, useEffect, useState } from 'react';

const FALLBACK_WAIT_SECONDS = 30;
const MAX_TIMEOUT_DELAY_MS = 2_147_483_647;

type WaitDeadline = Readonly<{
  seconds: number;
  expiresAt: number;
}>;

export type AuthenticationWait = Readonly<{
  isWaiting: boolean;
  waitSeconds?: number;
  isReady: boolean;
  startWait: (retryAfterSeconds?: number) => void;
  clearWait: () => void;
}>;

const getSafeWaitSeconds = (value: number | undefined): number => {
  if (
    value === undefined ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    !Number.isSafeInteger(Date.now() + value * 1000)
  ) {
    return FALLBACK_WAIT_SECONDS;
  }

  return value;
};

// Keep the reusable deadline hook next to its feedback component.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuthenticationWait = (): AuthenticationWait => {
  const [deadline, setDeadline] = useState<WaitDeadline | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!deadline) return undefined;

    const remainingMilliseconds = deadline.expiresAt - Date.now();
    if (remainingMilliseconds <= 0) {
      setDeadline(null);
      setIsReady(true);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      if (Date.now() >= deadline.expiresAt) {
        setDeadline(null);
        setIsReady(true);
        return;
      }

      setDeadline((currentDeadline) =>
        currentDeadline?.expiresAt === deadline.expiresAt
          ? { ...currentDeadline }
          : currentDeadline
      );
    }, Math.min(remainingMilliseconds, MAX_TIMEOUT_DELAY_MS));

    return () => window.clearTimeout(timeoutId);
  }, [deadline]);

  const startWait = useCallback((retryAfterSeconds?: number) => {
    const seconds = getSafeWaitSeconds(retryAfterSeconds);
    setIsReady(false);
    setDeadline({ seconds, expiresAt: Date.now() + seconds * 1000 });
  }, []);

  const clearWait = useCallback(() => {
    setDeadline(null);
    setIsReady(false);
  }, []);

  return {
    isWaiting: deadline !== null,
    ...(deadline ? { waitSeconds: deadline.seconds } : {}),
    isReady,
    startWait,
    clearWait,
  };
};

type AuthenticationWaitFeedbackProps = Readonly<{
  isWaiting: boolean;
  waitSeconds?: number;
  isReady: boolean;
  className?: string;
}>;

export const AuthenticationWaitFeedback = ({
  isWaiting,
  waitSeconds,
  isReady,
  className,
}: AuthenticationWaitFeedbackProps) => {
  if (!isWaiting && !isReady) return null;

  const safeSeconds = getSafeWaitSeconds(waitSeconds);
  const waitingMessage = `As tentativas foram limitadas temporariamente. Aguarde ${safeSeconds} ${safeSeconds === 1 ? 'segundo' : 'segundos'} antes de tentar novamente. O formulário será liberado depois; nenhuma solicitação será enviada automaticamente.`;

  return (
    <p
      role='status'
      aria-live='polite'
      aria-atomic='true'
      className={`rounded-md border border-borderMy bg-surface p-3 text-sm text-clt-2 ${className ?? ''}`.trim()}
    >
      {isWaiting
        ? waitingMessage
        : 'O período de espera terminou. Você pode tentar novamente quando estiver pronto.'}
    </p>
  );
};

export default AuthenticationWaitFeedback;
