import { startSession } from '@/auth/session';

export const establishTestSession = (
  userId = '42',
  role = 'Mentor',
  requiresPasswordChange = false
) =>
  startSession({
    userId,
    role,
    requiresPasswordChange,
    csrfToken: 'test-session-bound-proof',
  });
