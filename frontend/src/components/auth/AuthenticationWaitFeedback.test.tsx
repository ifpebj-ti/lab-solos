import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AuthenticationWaitFeedback,
  useAuthenticationWait,
} from './AuthenticationWaitFeedback';

const submit = vi.fn();

const WaitHarness = ({ retryAfterSeconds }: { retryAfterSeconds?: number }) => {
  const wait = useAuthenticationWait();

  return (
    <div>
      <AuthenticationWaitFeedback
        isWaiting={wait.isWaiting}
        waitSeconds={wait.waitSeconds}
        isReady={wait.isReady}
      />
      <button type='button' onClick={() => wait.startWait(retryAfterSeconds)}>
        Iniciar espera
      </button>
      <button
        type='button'
        disabled={wait.isWaiting}
        onClick={submit}
      >
        Enviar
      </button>
    </div>
  );
};

describe('AuthenticationWaitFeedback', () => {
  beforeEach(() => {
    submit.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T15:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('announces a fixed wait accessibly and unlocks without submitting', async () => {
    render(<WaitHarness retryAfterSeconds={4} />);
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar espera' }));

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(status).toHaveTextContent(/aguarde 4 segundos/i);
    expect(status).toHaveTextContent(/nenhuma solicita..o ser. enviada automaticamente/i);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3999);
    });
    expect(status).toHaveTextContent(/aguarde 4 segundos/i);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    expect(submit).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(status).toHaveTextContent(/voc[eê] pode tentar novamente/i);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();
    expect(submit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(submit).toHaveBeenCalledOnce();
  });

  it.each([undefined, 0, Number.NaN, Number.MAX_SAFE_INTEGER])(
    'uses the generic fallback when wait metadata is %s', async (retryAfterSeconds) => {
      render(<WaitHarness retryAfterSeconds={retryAfterSeconds} />);
      fireEvent.click(screen.getByRole('button', { name: 'Iniciar espera' }));

      expect(screen.getByRole('status')).toHaveTextContent(/aguarde 30 segundos/i);
      expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(29_999);
      });
      expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
      expect(submit).not.toHaveBeenCalled();
    }
  );

  it('clears the timer when the feedback owner unmounts', () => {
    const { unmount } = render(<WaitHarness retryAfterSeconds={20} />);
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar espera' }));

    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
