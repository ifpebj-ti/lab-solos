import { describe, expect, it } from 'vitest';
import baseApiSource from '../services/BaseApi.tsx?raw';
import buttonLogoutSource from '../components/global/ButtonLogout.tsx?raw';
import navUserSource from '../components/nav-user.tsx?raw';
import loginSource from '../pages/Login.tsx?raw';
import forgotPasswordSource from '../pages/ForgotPassword.tsx?raw';
import resetPasswordSource from '../pages/ResetPassword.tsx?raw';
import createAccountSource from '../pages/CreateAccount.tsx?raw';
import changePasswordSource from '../pages/ChangePassword.tsx?raw';
import page404Source from '../pages/Page404.tsx?raw';
import setupSource from '../test/setup.ts?raw';

const consumers = {
  BaseApi: baseApiSource,
  ButtonLogout: buttonLogoutSource,
  NavUser: navUserSource,
  Login: loginSource,
  ForgotPassword: forgotPasswordSource,
  ResetPassword: resetPasswordSource,
  CreateAccount: createAccountSource,
  ChangePassword: changePasswordSource,
};

describe('consumidores de encerramento de sessao', () => {
  it.each(Object.entries(consumers))(
    '%s delega a limpeza ao modulo central',
    (_name, source) => {
      expect(source).toContain("from '@/auth/session'");
      expect(source.match(/\bclearSession\b/g)).toHaveLength(2);
    }
  );

  it.each(Object.entries(consumers))(
    '%s nao remove estado de autenticacao diretamente',
    (_name, source) => {
      expect(source).not.toMatch(/\bCookie\.remove\s*\(/);
      expect(source).not.toMatch(/\blocalStorage\.clear\s*\(/);
    }
  );

  it('Page404 não limpa a sessão automaticamente ao montar', () => {
    expect(page404Source).not.toContain('useEffect');
    expect(page404Source).toContain("from '@/auth/session'");
  });

  it('mantém o logout explícito disponível para o nível não suportado', () => {
    expect(page404Source).toContain('clearSession');
    expect(page404Source).toContain('Sair');
  });

  it('configura isolamento de temporizadores, storage e cookies entre casos', () => {
    expect(setupSource).toContain('server.resetHandlers()');
    expect(setupSource).toContain('vi.useRealTimers()');
    expect(setupSource).toContain('window.localStorage.clear()');
    expect(setupSource).toContain('window.sessionStorage.clear()');
    expect(setupSource).toContain('Cookie.remove');
  });
});
