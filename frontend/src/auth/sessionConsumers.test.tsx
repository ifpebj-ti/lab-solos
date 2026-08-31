import { describe, expect, it } from 'vitest';
import baseApiSource from '../services/BaseApi.tsx?raw';
import buttonLogoutSource from '../components/global/ButtonLogout.tsx?raw';
import navUserSource from '../components/nav-user.tsx?raw';
import loginSource from '../pages/Login.tsx?raw';
import forgotPasswordSource from '../pages/ForgotPassword.tsx?raw';
import resetPasswordSource from '../pages/ResetPassword.tsx?raw';
import createAccountSource from '../pages/CreateAccount.tsx?raw';
import bootScreenSource from '../pages/BootScreen.tsx?raw';
import preLabSource from '../pages/prelab/PreLab.tsx?raw';
import page404Source from '../pages/Page404.tsx?raw';

const consumers = {
  BaseApi: baseApiSource,
  ButtonLogout: buttonLogoutSource,
  NavUser: navUserSource,
  Login: loginSource,
  ForgotPassword: forgotPasswordSource,
  ResetPassword: resetPasswordSource,
  CreateAccount: createAccountSource,
  BootScreen: bootScreenSource,
  PreLab: preLabSource,
  Page404: page404Source,
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
});
