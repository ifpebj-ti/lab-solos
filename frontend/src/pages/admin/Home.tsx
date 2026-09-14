import { useCallback, useEffect, useMemo, useState } from 'react';
import Cookie from 'js-cookie';
import { ArrowLeftRight, PackageSearch, Users } from 'lucide-react';

import { readSession } from '@/auth/session';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import InfoCard from '@/components/screens/InfoCard';
import type { Dependente } from '@/contracts/user';
import AlertIcon from '../../../public/icons/AlertIcon';
import JoinIcon from '../../../public/icons/JoinIcon';
import LoanIcon from '../../../public/icons/LoanIcon';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { getDependentesForApproval } from '@/integration/Class';
import { getAllLoans } from '@/integration/Loans';
import { getAlertProducts } from '@/integration/Product';
import {
  getProfileShortcuts,
  type ProfileShortcut,
} from '@/navigation/profileNavigation';

type CollectionState<T> = {
  data: T[] | null;
  error: unknown | null;
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

function Home() {
  const session = readSession();
  const role = session?.role;
  const rankId = Cookie.get('rankID') ?? session?.userId ?? '';
  const shortcuts = getProfileShortcuts(role);
  const [approval, setApproval] = useState<CollectionState<Dependente>>(
    emptyCollection
  );
  const [loans, setLoans] = useState<CollectionState<{ status?: string }>>(
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
  ) => (
    <ErrorFeedback
      error={error}
      operationId={operationId}
      onRetry={retry}
      className='w-11/12'
    />
  );

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
