export const securityE2eData = {
  baseURL: process.env.SECURITY_E2E_BASE_URL ?? 'https://localhost:18443',
  protectedApiPath: '/api/Usuarios',
  frontendRoutes: ['/', '/login'] as const,
};
