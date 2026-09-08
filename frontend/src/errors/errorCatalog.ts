import { getPasswordErrorMessage } from '@/auth/passwordPolicy';

import type { ErrorCategory } from './applicationError';

export type ErrorCatalogEntry = Readonly<{
  message: string;
  suggestedAction: string;
  retryable: boolean;
}>;

export const ERROR_CATALOG: Readonly<Record<ErrorCategory, ErrorCatalogEntry>> =
  Object.freeze({
    validation: {
      message: 'Os dados informados precisam de revisão.',
      suggestedAction: 'Corrigir os campos indicados e reenviar.',
      retryable: false,
    },
    authentication: {
      message: 'Sua sessão expirou ou não é válida.',
      suggestedAction: 'Entrar novamente.',
      retryable: false,
    },
    authorization: {
      message: 'Você não tem permissão para esta ação.',
      suggestedAction: 'Manter a sessão e voltar ou solicitar acesso.',
      retryable: false,
    },
    not_found: {
      message: 'O recurso solicitado não foi encontrado.',
      suggestedAction: 'Conferir o contexto ou voltar.',
      retryable: false,
    },
    conflict: {
      message: 'O conteúdo foi alterado ou já processado.',
      suggestedAction: 'Atualizar os dados antes de tentar novamente.',
      retryable: false,
    },
    network: {
      message: 'Não foi possível conectar ao serviço.',
      suggestedAction: 'Conferir a conexão e tentar novamente.',
      retryable: true,
    },
    timeout: {
      message: 'O serviço demorou mais que o esperado.',
      suggestedAction: 'Tentar novamente.',
      retryable: true,
    },
    server: {
      message: 'O serviço não conseguiu concluir a operação.',
      suggestedAction: 'Tentar novamente mais tarde.',
      retryable: true,
    },
    unknown: {
      message: 'Não foi possível concluir a operação.',
      suggestedAction: 'Tentar novamente; acionar suporte se persistir.',
      retryable: false,
    },
  });

export const KNOWN_ERROR_CODES = [
  'password_required',
  'password_too_short',
  'password_too_long',
  'password_common',
  'password_confirmation_mismatch',
  'current_password_invalid',
  'password_reset_invalid',
  'credential_concurrency_conflict',
  'password_invalid',
] as const;

export type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

const knownCodeSet = new Set<string>(KNOWN_ERROR_CODES);

export const isKnownErrorCode = (value: unknown): value is KnownErrorCode =>
  typeof value === 'string' && knownCodeSet.has(value);

export const EXPECTED_ERROR_FIELDS = [
  'email',
  'password',
  'currentPassword',
  'newPassword',
  'confirmation',
  'token',
  'nome',
  'senha',
  'repeat',
  'tipoUsuario',
  'telefone',
  'instituicao',
  'cidade',
  'curso',
  'emailMentor',
  'marca',
  'quantidade',
  'minimo',
  'capacidade',
  'localizacao',
  'formula',
  'catmat',
  'dataFabricacao',
  'dataValidade',
] as const;

export type ExpectedErrorField = (typeof EXPECTED_ERROR_FIELDS)[number];

const fieldByLowerCase = new Map<string, ExpectedErrorField>(
  EXPECTED_ERROR_FIELDS.map((field) => [field.toLowerCase(), field])
);

const legacyFieldAliases = new Map<string, ExpectedErrorField>([
  ['code', 'token'],
]);

export const normalizeErrorField = (
  value: unknown
): ExpectedErrorField | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalizedValue = value.toLowerCase();
  return (
    fieldByLowerCase.get(normalizedValue) ??
    legacyFieldAliases.get(normalizedValue)
  );
};

export const isExpectedErrorField = (value: unknown): value is ExpectedErrorField =>
  normalizeErrorField(value) !== undefined;

const PASSWORD_FIELDS = new Set<ExpectedErrorField>(['senha', 'newPassword']);

const codeAppliesToField = (
  field: ExpectedErrorField,
  code: KnownErrorCode
): boolean => {
  if (
    code === 'current_password_invalid' ||
    code === 'password_confirmation_mismatch'
  ) {
    return (
      (code === 'current_password_invalid' && field === 'currentPassword') ||
      (code === 'password_confirmation_mismatch' && field === 'confirmation')
    );
  }

  if (code === 'password_reset_invalid') return field === 'token';
  if (code.startsWith('password_')) return PASSWORD_FIELDS.has(field);

  return false;
};

export const getFieldErrorMessage = (
  field: unknown,
  code: unknown
): string | undefined => {
  const normalizedField = normalizeErrorField(field);
  if (!normalizedField) return undefined;

  if (isKnownErrorCode(code) && codeAppliesToField(normalizedField, code)) {
    if (code === 'password_reset_invalid') {
      return 'O código de redefinição é inválido ou expirou.';
    }
    if (code === 'current_password_invalid') {
      return 'A senha atual está incorreta.';
    }
    if (code === 'password_confirmation_mismatch') {
      return 'A confirmação da senha não corresponde.';
    }
    return getPasswordErrorMessage(code);
  }

  return 'Verifique este campo.';
};

export const OPERATION_IDS = {
  login: 'auth.login',
  changePassword: 'auth.changePassword',
  createMentor: 'registration.createMentor',
  requestPasswordReset: 'recovery.requestPasswordReset',
  resetPassword: 'recovery.resetPassword',
  auditLogs: 'audit.list',
  auditReport: 'audit.report',
  markAuditLogSuspicious: 'audit.markSuspicious',
  markAuditLogNotSuspicious: 'audit.markNotSuspicious',
  checkSuspiciousActivity: 'audit.checkSuspiciousActivity',
  loansByDependents: 'class.loansByDependents',
  dependents: 'class.dependents',
  dependentsById: 'class.dependentsById',
  dependentsForApproval: 'class.dependentsForApproval',
  usersForApproval: 'class.usersForApproval',
  approveDependent: 'class.approveDependent',
  rejectDependent: 'class.rejectDependent',
  loansByClass: 'class.loansByClass',
  loansByUser: 'loans.byUser',
  loanById: 'loans.byId',
  createLoan: 'loans.create',
  allLoans: 'loans.list',
  approveLoan: 'loans.approve',
  rejectLoan: 'loans.reject',
  returnLoan: 'loans.return',
  notifications: 'notifications.list',
  unreadNotifications: 'notifications.unreadCount',
  markNotificationRead: 'notifications.markRead',
  markNotificationsRead: 'notifications.markManyRead',
  createNotification: 'notifications.create',
  generateNotifications: 'notifications.generateAutomatic',
  checkOverdueLoans: 'notifications.checkOverdueLoans',
  productById: 'products.byId',
  products: 'products.list',
  alertProducts: 'products.alerts',
  createProduct: 'products.create',
  productHistory: 'products.history',
  updateProduct: 'products.update',
  systemQuantities: 'system.quantities',
  registeredUsers: 'users.list',
  userById: 'users.byId',
  updateUserStatus: 'users.updateStatus',
  currentUser: 'users.current',
} as const;

export type OperationId = (typeof OPERATION_IDS)[keyof typeof OPERATION_IDS];

export const OPERATION_LABELS: Readonly<Record<OperationId, string>> = {
  'auth.login': 'entrar',
  'auth.changePassword': 'alterar a senha',
  'registration.createMentor': 'cadastrar o usuário',
  'recovery.requestPasswordReset': 'solicitar a recuperação de senha',
  'recovery.resetPassword': 'redefinir a senha',
  'audit.list': 'carregar os registros de auditoria',
  'audit.report': 'gerar o relatório de auditoria',
  'audit.markSuspicious': 'marcar o registro como suspeito',
  'audit.markNotSuspicious': 'remover a marcação de suspeita',
  'audit.checkSuspiciousActivity': 'verificar atividade suspeita',
  'class.loansByDependents': 'carregar os empréstimos dos dependentes',
  'class.dependents': 'carregar os dependentes',
  'class.dependentsById': 'carregar os dependentes da turma',
  'class.dependentsForApproval': 'carregar os cadastros para aprovação',
  'class.usersForApproval': 'carregar os usuários para aprovação',
  'class.approveDependent': 'aprovar o cadastro',
  'class.rejectDependent': 'rejeitar o cadastro',
  'class.loansByClass': 'carregar os empréstimos da turma',
  'loans.byUser': 'carregar os empréstimos do usuário',
  'loans.byId': 'carregar o empréstimo',
  'loans.create': 'criar o empréstimo',
  'loans.list': 'carregar os empréstimos',
  'loans.approve': 'aprovar o empréstimo',
  'loans.reject': 'rejeitar o empréstimo',
  'loans.return': 'registrar a devolução',
  'notifications.list': 'carregar as notificações',
  'notifications.unreadCount': 'contar as notificações não lidas',
  'notifications.markRead': 'marcar a notificação como lida',
  'notifications.markManyRead': 'marcar as notificações como lidas',
  'notifications.create': 'criar a notificação',
  'notifications.generateAutomatic': 'gerar notificações automáticas',
  'notifications.checkOverdueLoans': 'verificar empréstimos vencidos',
  'products.byId': 'carregar o produto',
  'products.list': 'carregar os produtos',
  'products.alerts': 'carregar os produtos em alerta',
  'products.create': 'criar o produto',
  'products.history': 'carregar o histórico do produto',
  'products.update': 'atualizar o produto',
  'system.quantities': 'carregar os indicadores do sistema',
  'users.list': 'carregar os usuários',
  'users.byId': 'carregar o usuário',
  'users.updateStatus': 'atualizar o status do usuário',
  'users.current': 'carregar o usuário atual',
};

export const OPERATION_CATALOG = OPERATION_LABELS;

const operationIdSet = new Set<OperationId>(Object.values(OPERATION_IDS));

export const isOperationId = (value: unknown): value is OperationId =>
  typeof value === 'string' && operationIdSet.has(value as OperationId);

export const getOperationLabel = (operation: OperationId | string): string =>
  isOperationId(operation) ? OPERATION_LABELS[operation] : 'esta operação';
