import { useCallback, useEffect, useMemo, useState } from 'react';
import Cookie from 'js-cookie';
import { ArrowLeftRight, PackageSearch, Users } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { readSession } from '@/auth/session';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import InfoCard from '@/components/screens/InfoCard';
import type { Dependente } from '@/contracts/user';
import AlertIcon from '../../../public/icons/AlertIcon';
import JoinIcon from '../../../public/icons/JoinIcon';
import LoanIcon from '../../../public/icons/LoanIcon';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { presentError } from '@/errors/presentError';
import { getDependentesForApproval } from '@/integration/Class';
import { getAllLoans } from '@/integration/Loans';
import { getAlertProducts } from '@/integration/Product';
import {
  buildDetailUrl,
  getProfileShortcuts,
  readIdFromLocation,
  type ProfileShortcut,
} from '@/navigation/profileNavigation';

type CollectionState<T> = {
  data: T[] | null;
  error: unknown | null;
};

type LoanSummary = {
  id: number;
  status?: string;
  solicitante?: {
    nomeCompleto?: string;
  } | null;
};

const emptyCollection = <T,>(): CollectionState<T> => ({
  data: null,
  error: null,
});

const iconForPath = (path: string) => {
  if (path === '/admin/register-request') return <JoinIcon />;
  if (path === '/admin/loans-request') return <LoanIcon />;
  if (path === '/admin/search-material') {
    return <PackageSearch className='text-green-600' size={35} />;
  }
  if (path === '/admin/users') {
    return <Users className='text-green-600' size={35} />;
  }
  if (path === '/admin/all-loans') {
    return <ArrowLeftRight className='text-green-600' size={35} />;
  }
  return <AlertIcon />;
};

const getDiagnosticMessage = (error: unknown): string | null => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' && message ? message : null;
  }
  return null;
};

function Home() {
  const session = readSession();
  const role = session?.role;
  const rankId = Cookie.get('rankID') ?? session?.userId ?? '';
  const shortcuts = getProfileShortcuts(role);
  const location = useLocation();
  const navigate = useNavigate();
  const [approval, setApproval] = useState<CollectionState<Dependente>>(
    emptyCollection
  );
  const [loans, setLoans] = useState<CollectionState<LoanSummary>>(
    emptyCollection
  );
  const [alerts, setAlerts] = useState<CollectionState<unknown>>(
    emptyCollection
  );

  const loadApproval = useCallback(async () => {
    try {
      const response = await getDependentesForApproval(rankId);
      setApproval({ data: response, error: null });
    } catch (error) {
      setApproval((current) => ({ ...current, error }));
    }
  }, [rankId]);

  const loadLoans = useCallback(async () => {
    try {
      const response = await getAllLoans();
      setLoans({ data: response, error: null });
    } catch (error) {
      setLoans((current) => ({ ...current, error }));
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const response = await getAlertProducts();
      setAlerts({ data: response, error: null });
    } catch (error) {
      setAlerts((current) => ({ ...current, error }));
    }
  }, []);

  useEffect(() => {
    if (role !== 'Administrador') return;
    void loadApproval();
    void loadLoans();
    void loadAlerts();
  }, [loadAlerts, loadApproval, loadLoans, role]);

  const pendingLoans = useMemo(
    () => loans.data?.filter((loan) => loan.status === 'Pendente') ?? [],
    [loans.data]
  );

  const selectedId = useMemo(
    () => readIdFromLocation(location).id,
    [location]
  );
  const hasInvalidSelectedId = useMemo(
    () => location.search.includes('id=') && selectedId === null,
    [location.search, selectedId]
  );
  const selectedRegistration = useMemo(
    () =>
      selectedId === null
        ? undefined
        : approval.data?.find((request) => request.id === selectedId),
    [approval.data, selectedId]
  );
  const selectedLoan = useMemo(
    () =>
      selectedId === null
        ? undefined
        : pendingLoans.find((loan) => loan.id === selectedId),
    [pendingLoans, selectedId]
  );

  const selectPending = (id: number) => {
    const params = new URLSearchParams(location.search);
    params.set('id', String(id));
    navigate({ search: `?${params.toString()}` });
  };

  const countForShortcut = (shortcut: ProfileShortcut): number | undefined => {
    if (shortcut.to === '/admin/register-request') {
      return approval.data?.length;
    }
    if (shortcut.to === '/admin/loans-request') {
      return pendingLoans.length;
    }
    if (shortcut.to === '/admin/follow-up') {
      return alerts.data?.length;
    }
    return undefined;
  };

  const renderError = (
    error: unknown,
    operationId: (typeof OPERATION_IDS)[keyof typeof OPERATION_IDS],
    retry: () => void
  ) => {
    const basePresentation = presentError(error, operationId);
    const diagnosticMessage = getDiagnosticMessage(error);
    const presentation = diagnosticMessage
      ? {
          ...basePresentation,
          description: `${diagnosticMessage} ${basePresentation.description}`,
        }
      : basePresentation;

    return (
      <ErrorFeedback
        presentation={presentation}
        onRetry={retry}
        className='w-11/12'
      />
    );
  };

  return (
    <div className='w-full min-h-screen flex justify-start items-center flex-col overflow-y-auto bg-backgroundMy gap-1'>
      <div className='w-full min-h-20 flex items-center justify-between mt-2 px-10'>
        <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
          Home
        </h1>
      </div>

      <div className='w-full flex flex-col items-center justify-center mt-2 px-10 gap-4'>
        {role === 'Administrador' && approval.error
          ? renderError(
              approval.error,
              OPERATION_IDS.dependentsForApproval,
              loadApproval
            )
          : null}
        {role === 'Administrador' && loans.error
          ? renderError(loans.error, OPERATION_IDS.allLoans, loadLoans)
          : null}
        {role === 'Administrador' && alerts.error
          ? renderError(alerts.error, OPERATION_IDS.alertProducts, loadAlerts)
          : null}

        <div className='w-full flex items-center justify-center py-2'>
          <div className='w-full flex justify-center flex-col font-rajdhani-semibold text-4xl md:text-5xl lg:text-6xl text-clt-2 gap-y-3 lg:bg-[url(../../public/images/laboratory.png)] bg-no-repeat bg-center lg:bg-right-bottom bg-contain'>
            <div className='w-full md:w-11/12 flex items-center justify-center bg-backgroundMy/80 lg:bg-transparent'>
              <p>
                Bem-vindo(a) ao Laboratório de
                <span className='text-primaryMy'> Solos e</span>
                <span className='text-primaryMy'> Sustentabilidade </span>
                Ambiental -<span className='text-primaryMy'> IFPEBJ</span>
              </p>
            </div>
          </div>
        </div>

        {shortcuts.length > 0 ? (
          <div className='w-full flex flex-wrap items-stretch justify-center gap-4 pb-6'>
            {shortcuts.map((shortcut) => {
              const quant = countForShortcut(shortcut);
              return (
                <InfoCard
                  key={shortcut.to}
                  icon={iconForPath(shortcut.to)}
                  text={shortcut.label}
                  notify={quant !== undefined && quant > 0}
                  link={shortcut.to}
                  quant={quant}
                />
              );
            })}
          </div>
        ) : null}

        {role === 'Administrador' ? (
          <section
            aria-labelledby='admin-analysis-title'
            className='w-full max-w-6xl rounded-2xl border border-border bg-card p-5 shadow-sm'
          >
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground'>
                  Espaço de análise
                </p>
                <h2 id='admin-analysis-title' className='text-xl font-semibold text-foreground'>
                  Pendências para análise
                </h2>
              </div>
              {selectedId !== null && !hasInvalidSelectedId ? (
                <Link
                  className='text-sm font-semibold text-primary underline-offset-4 hover:underline'
                  to='/admin'
                >
                  Limpar seleção
                </Link>
              ) : null}
            </div>

            {hasInvalidSelectedId ? (
              <p className='mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
                O ID selecionado é inválido.
              </p>
            ) : selectedId !== null && selectedRegistration ? (
              <div className='mt-5 rounded-xl border border-border bg-background p-4'>
                <p className='text-sm font-semibold text-muted-foreground'>
                  Solicitação de cadastro
                </p>
                <h3 className='mt-1 text-lg font-semibold text-foreground'>
                  {selectedRegistration.nomeCompleto}
                </h3>
                <p className='mt-1 text-sm text-muted-foreground'>
                  {selectedRegistration.email}
                </p>
                <Link
                  className='mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90'
                  to={buildDetailUrl('/admin/register-request', selectedRegistration.id)}
                >
                  Analisar solicitação
                </Link>
              </div>
            ) : selectedId !== null && selectedLoan ? (
              <div className='mt-5 rounded-xl border border-border bg-background p-4'>
                <p className='text-sm font-semibold text-muted-foreground'>
                  Solicitação de empréstimo
                </p>
                <h3 className='mt-1 text-lg font-semibold text-foreground'>
                  Pedido #{selectedLoan.id}
                </h3>
                {selectedLoan.solicitante?.nomeCompleto ? (
                  <p className='mt-1 text-sm text-muted-foreground'>
                    Solicitante: {selectedLoan.solicitante.nomeCompleto}
                  </p>
                ) : null}
                <Link
                  className='mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90'
                  to={buildDetailUrl('/admin/loans-request', selectedLoan.id)}
                >
                  Analisar solicitação
                </Link>
              </div>
            ) : selectedId !== null && approval.data !== null && loans.data !== null ? (
              <p className='mt-5 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground'>
                Esta pendência não está disponível.
              </p>
            ) : null}

            {selectedId === null ? (
              <div className='mt-5 grid gap-3 md:grid-cols-2'>
                {approval.data === null || approval.data.length === 0 ? (
                  <p className='rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground'>
                    Nenhuma solicitação de cadastro disponível.
                  </p>
                ) : null}
                {approval.data?.map((request) => (
                  <button
                    key={`registration-${request.id}`}
                    type='button'
                    className='rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-primary hover:bg-primary/5'
                    onClick={() => selectPending(request.id)}
                    aria-label={`Solicitação de cadastro — ${request.nomeCompleto}`}
                  >
                    <span className='block text-sm font-semibold text-foreground'>
                      Solicitação de cadastro
                    </span>
                    <span className='mt-1 block text-base text-foreground'>
                      {request.nomeCompleto}
                    </span>
                  </button>
                ))}
                {pendingLoans.map((loan) => (
                  <button
                    key={`loan-${loan.id}`}
                    type='button'
                    className='rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-primary hover:bg-primary/5'
                    onClick={() => selectPending(loan.id)}
                    aria-label={`Solicitação de empréstimo — ${loan.id}`}
                  >
                    <span className='block text-sm font-semibold text-foreground'>
                      Solicitação de empréstimo
                    </span>
                    <span className='mt-1 block text-base text-foreground'>
                      Pedido #{loan.id}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <div className='sr-only' role='status' aria-live='polite'>
          {approval.data === null && loans.data === null && alerts.data === null
            ? 'Carregando dados da home'
            : ''}
        </div>
      </div>
    </div>
  );
}

export default Home;
