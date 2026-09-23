import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../public/icons/LoadingIcon';
import { useCallback, useEffect, useState } from 'react';
import InfoContainer from '@/components/screens/InfoContainer';
import ClassMemberList from '@/components/screens/ClassMemberList';
import { useLocation, useNavigate } from 'react-router-dom';
import { getDependentesID } from '@/integration/Class';
import { getUserById } from '@/integration/Users';
import { displayUserValue, formatCivilDate } from '@/function/date';
import type { ResponsiveColumn } from '@/components/global/table/ResponsiveTable';
import { academicoSchema } from '@/contracts/user';
import type { Academico, Dependente } from '@/contracts/user';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import BackLink from '@/components/global/BackLink';
import {
  buildDetailUrl,
  readIdFromLocation,
} from '@/navigation/profileNavigation';

const classColumns: readonly ResponsiveColumn[] = [
  { key: 'name', label: 'Nome', weight: 25 },
  { key: 'email', label: 'Email', weight: 25 },
  { key: 'institution', label: 'Instituição', weight: 20 },
  { key: 'course', label: 'Curso', weight: 15 },
  { key: 'status', label: 'Status', weight: 15 },
];

const hasQueryId = (resolution: ReturnType<typeof readIdFromLocation>) =>
  resolution.source === 'query' && resolution.id !== null;

const hasLegacyStateId = (resolution: ReturnType<typeof readIdFromLocation>) =>
  resolution.source === 'state' && resolution.id !== null;

const isClassViewBusy = (loading: boolean, hasLegacyId: boolean) =>
  loading || hasLegacyId;

// aqui virá a listagem dos integrantes da turma
function ViewClass() {
  const [isDependentsLoading, setIsDependentsLoading] = useState(false);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const idResolution = readIdFromLocation(location);
  const hasValidQueryId = hasQueryId(idResolution);
  const hasLegacyId = hasLegacyStateId(idResolution);
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [user, setUser] = useState<Academico>();
  const [dependentsError, setDependentsError] = useState<unknown>();
  const [userError, setUserError] = useState<unknown>();

  useEffect(() => {
    if (!hasLegacyId || idResolution.id === null) return;

    navigate(
      buildDetailUrl(`${location.pathname}${location.search}`, idResolution.id),
      { replace: true, state: null }
    );
  }, [hasLegacyId, idResolution.id, location.pathname, location.search, navigate]);

  const loadDependents = useCallback(async () => {
    if (!hasValidQueryId || idResolution.id === null) {
      setIsDependentsLoading(false);
      setDependentsError(undefined);
      return;
    }

    setIsDependentsLoading(true);
    setDependentsError(undefined);

    try {
      const response = await getDependentesID(String(idResolution.id));
      setDependentes(response);
    } catch (error) {
      setDependentsError(error);
    } finally {
      setIsDependentsLoading(false);
    }
  }, [hasValidQueryId, idResolution.id]);

  const loadUser = useCallback(async () => {
    if (!hasValidQueryId || idResolution.id === null) {
      setIsUserLoading(false);
      setUserError(undefined);
      return;
    }

    setIsUserLoading(true);
    setUserError(undefined);

    try {
      const responseUser = await getUserById({ id: idResolution.id });
      const academicUser = academicoSchema.safeParse(responseUser);
      if (!academicUser.success) {
        throw new Error('Dados inválidos para a turma.');
      }
      setUser(academicUser.data);
    } catch (error) {
      setUserError(error);
    } finally {
      setIsUserLoading(false);
    }
  }, [hasValidQueryId, idResolution.id]);

  useEffect(() => {
    void loadDependents();
    void loadUser();
  }, [loadDependents, loadUser]);

  const isLoading = isDependentsLoading || isUserLoading;

  const infoItems = [
    { title: 'Nome', value: user?.nomeCompleto ?? '', width: '50%' },
    { title: 'Email', value: user?.email ?? '', width: '30%' },
    {
      title: 'Instituição',
      value: displayUserValue(user?.instituicao),
      width: '20%',
    },
  ];
  const infoItems5 = [
    { title: 'Status', value: user?.status ?? '', width: '100%' },
  ];
  const infoItems3 = [
    {
      title: 'Número para Contato',
      value: displayUserValue(user?.telefone),
      width: '100%',
    },
  ];
  const infoItems4 = [
    {
      title: 'Data de Ingresso',
      value: formatCivilDate(user?.dataIngresso),
      width: '100%',
    },
  ];
  const infoItems2 = [
    {
      title: 'Curso',
      value: displayUserValue(user?.curso),
      width: '50%',
    },
    {
      title: 'Cidade',
      value: displayUserValue(user?.cidade),
      width: '50%',
    },
  ];
  return (
    <main aria-busy={isClassViewBusy(isLoading, hasLegacyId)} className='min-h-svh bg-canvas text-clt-2'>
      {hasLegacyId ? (
        <div role='status' className='flex min-h-svh w-full items-center justify-center gap-x-4 bg-canvas font-inter-medium text-clt-2'>
          <div className='h-5 w-5 animate-spin rounded-full border-2 border-primaryMy border-t-transparent'>
            <LoadingIcon />
          </div>
          Carregando...
          <BackLink pathname='/admin/view-class' />
        </div>
      ) : !hasValidQueryId ? (
        <div className='flex min-h-svh flex-col items-center justify-center gap-4 bg-canvas p-6'>
          <p>Selecione um registro para consultar</p>
          <BackLink pathname='/admin/view-class' />
        </div>
      ) : isLoading ? (
        <div role='status' className='flex min-h-svh w-full items-center justify-center gap-x-4 bg-canvas font-inter-medium text-clt-2'>
          <div className='h-5 w-5 animate-spin rounded-full border-2 border-primaryMy border-t-transparent'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : dependentsError ? (
        <div className='flex min-h-svh w-full items-center justify-center bg-canvas px-4 py-8'>
          <ErrorFeedback
            error={dependentsError}
            operationId={OPERATION_IDS.dependentsById}
            onRetry={() => void loadDependents()}
            onNavigate={() => navigate('/admin/users')}
          />
        </div>
      ) : userError ? (
        <div className='flex min-h-svh w-full items-center justify-center bg-canvas px-4 py-8'>
          <ErrorFeedback
            error={userError}
            operationId={OPERATION_IDS.userById}
            onRetry={() => void loadUser()}
            onNavigate={() => navigate('/admin/users')}
          />
        </div>
      ) : user ? (
        <div className='mx-auto flex min-h-svh w-full max-w-7xl flex-col overflow-y-auto bg-canvas px-4 pb-12 sm:px-6 lg:px-8'>
          <div className='flex min-w-0 flex-wrap items-center justify-between gap-4 pt-8'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Visualização de Turmas
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='mt-8 w-full min-w-0'>
            <InfoContainer items={infoItems} />
            <div className='mt-5 flex w-full min-w-0 flex-wrap gap-3'>
              <InfoContainer items={infoItems2} />
              <InfoContainer items={infoItems3} />
              <InfoContainer items={infoItems4} />
              <InfoContainer items={infoItems5} />
            </div>
          </div>
          <ClassMemberList
            label='Usuários da turma'
            columns={classColumns}
            members={dependentes}
            destinationRoute='/admin/view-class-mentor'
            emptyMessage='Nenhum usuário encontrado nesta turma.'
            filteredMessage='Nenhum usuário encontrado para os filtros aplicados.'
            helperMessage='Os membros da turma aparecerão aqui quando forem cadastrados.'
            includeStatus
          />
        </div>
      ) : (
        <div className='flex min-h-svh w-full items-center justify-center bg-canvas px-4 py-8'>
          <ErrorFeedback
            error={new Error('Usuário da turma indisponível.')}
            operationId={OPERATION_IDS.userById}
            onRetry={() => void loadUser()}
            onNavigate={() => navigate('/admin/users')}
          />
        </div>
      )}
    </main>
  );
}

export default ViewClass;
