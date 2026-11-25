import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Download,
  Filter,
  Shield,
  User,
} from 'lucide-react';

import LoadingIcon from '../../../public/icons/LoadingIcon';
import {
  exportarAuditoria,
  gerarRelatorioAuditoria,
  marcarLogComoNaoSuspeito,
  marcarLogComoSuspeito,
  obterLogsAuditoria,
  type FiltroAuditoria,
  type LogAuditoria,
  type RelatorioAuditoria,
} from '@/integration/Auditoria';
import { toast } from '@/components/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { notifyError } from '@/errors/presentError';
import DateInput from '@/components/global/inputs/DateInput';
import { CIVIL_DATE_INPUT_MASK, parseCivilDateInput } from '@/function/date';

type RevisaoPendente = {
  log: LogAuditoria;
  suspeitaResultante: boolean;
};

type CampoDataFiltro = 'dataInicio' | 'dataFim';
type ErrosDataFiltro = Partial<Record<CampoDataFiltro, string>>;

const ACOES_AUDITORIA = [
  ['Login', 'Login'],
  ['LoginFalhado', 'Falha de login'],
  ['CriacaoUsuario', 'Criação de usuário'],
  ['AlteracaoUsuario', 'Alteração de usuário'],
  ['CriacaoProduto', 'Criação de produto'],
  ['AlteracaoProduto', 'Alteração de produto'],
  ['CriacaoEmprestimo', 'Criação de empréstimo'],
  ['AprovacaoEmprestimo', 'Aprovação de empréstimo'],
  ['RejeicaoEmprestimo', 'Rejeição de empréstimo'],
  ['DevolucaoEmprestimo', 'Devolução de empréstimo'],
  ['ExportacaoDados', 'Exportação de dados'],
  ['Outro', 'Outra ação'],
] as const;

const PAGINACAO_INICIAL = { pagina: 1, tamanhoPagina: 25 };

function AuditReportCards({
  relatorio,
  logsError,
  loadingReport,
}: {
  relatorio: RelatorioAuditoria | null;
  logsError: unknown;
  loadingReport: boolean;
}) {
  if (!relatorio || logsError || loadingReport) return null;

  const cards = [
    {
      label: 'Total de Logs',
      value: relatorio.totalLogs,
      icon: Calendar,
      iconClass: 'text-primaryMy',
      valueClass: 'text-clt-2',
    },
    {
      label: 'Logs Suspeitos',
      value: relatorio.logsSuspeitos,
      icon: AlertTriangle,
      iconClass: 'text-clt-1',
      valueClass: 'text-clt-2',
    },
    {
      label: 'Logs Críticos',
      value: relatorio.logsCriticos,
      icon: Shield,
      iconClass: 'text-danger',
      valueClass: 'text-danger',
    },
    {
      label: 'Dias com atividade',
      value: Object.keys(relatorio.logsPorDia).length,
      icon: Calendar,
      iconClass: 'text-primaryMy',
      valueClass: 'text-clt-2',
    },
  ];

  return (
    <div className='mt-7 grid grid-cols-1 gap-4 md:grid-cols-4'>
      {cards.map(({ label, value, icon: Icon, iconClass, valueClass }) => (
        <div
          key={label}
          className='rounded-xl border border-borderMy bg-surface p-4'
        >
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-clt-1'>{label}</p>
              <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
            </div>
            <Icon className={`h-8 w-8 ${iconClass}`} aria-hidden='true' />
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditFilters({
  filtrosRascunho,
  setFiltrosRascunho,
  errosDatas,
  atualizarDataRascunho,
  limparFiltros,
  aplicarFiltros,
}: {
  filtrosRascunho: FiltroAuditoria;
  setFiltrosRascunho: React.Dispatch<React.SetStateAction<FiltroAuditoria>>;
  errosDatas: ErrosDataFiltro;
  atualizarDataRascunho: (campo: CampoDataFiltro, valor: string) => void;
  limparFiltros: () => void;
  aplicarFiltros: () => void;
}) {
  return (
    <section
      aria-label='Filtros de auditoria'
      className='mt-7 rounded-xl border border-borderMy bg-surface p-4'
    >
      <div className='mb-4 flex items-center gap-2 font-medium'>
        <Filter className='h-4 w-4' aria-hidden='true' />
        <h2>Filtros</h2>
      </div>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <div className='min-w-0 [&_label]:!mt-0'>
          <DateInput
            nome='Data inicial'
            name='dataInicio'
            value={filtrosRascunho.dataInicio ?? ''}
            onChange={(value) => atualizarDataRascunho('dataInicio', value)}
            error={errosDatas.dataInicio}
          />
        </div>
        <div className='min-w-0 [&_label]:!mt-0'>
          <DateInput
            nome='Data final'
            name='dataFim'
            value={filtrosRascunho.dataFim ?? ''}
            onChange={(value) => atualizarDataRascunho('dataFim', value)}
            error={errosDatas.dataFim}
          />
        </div>
        <label className='flex flex-col gap-1 text-sm'>
          Usuário (ID)
          <Input
            aria-label='Usuário (ID)'
            type='number'
            min='1'
            value={filtrosRascunho.usuarioId ?? ''}
            onChange={(event) => {
              const usuarioId = Number(event.target.value);
              setFiltrosRascunho((previous) => ({
                ...previous,
                usuarioId: usuarioId > 0 ? usuarioId : undefined,
              }));
            }}
          />
        </label>
        <label className='flex flex-col gap-1 text-sm'>
          Recurso
          <Input
            aria-label='Recurso'
            type='text'
            maxLength={100}
            value={filtrosRascunho.recurso ?? ''}
            onChange={(event) =>
              setFiltrosRascunho((previous) => ({
                ...previous,
                recurso: event.target.value || undefined,
              }))
            }
          />
        </label>
        <label className='flex flex-col gap-1 text-sm'>
          Tipo de ação
          <Select
            value={filtrosRascunho.tipoAcao ?? 'todas'}
            onValueChange={(value) =>
              setFiltrosRascunho((previous) => ({
                ...previous,
                tipoAcao: value === 'todas' ? undefined : value,
              }))
            }
          >
            <SelectTrigger aria-label='Tipo de ação'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='todas'>Todas as ações</SelectItem>
              {ACOES_AUDITORIA.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className='flex flex-col gap-1 text-sm'>
          Nível de risco
          <Select
            value={filtrosRascunho.nivelRisco ?? 'todos'}
            onValueChange={(value) =>
              setFiltrosRascunho((previous) => ({
                ...previous,
                nivelRisco: value === 'todos' ? undefined : value,
              }))
            }
          >
            <SelectTrigger aria-label='Nível de risco'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='todos'>Todos os níveis</SelectItem>
              <SelectItem value='Baixo'>Baixo</SelectItem>
              <SelectItem value='Medio'>Médio</SelectItem>
              <SelectItem value='Alto'>Alto</SelectItem>
              <SelectItem value='Critico'>Crítico</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className='flex flex-col gap-1 text-sm'>
          Classificação
          <Select
            value={
              filtrosRascunho.apenasSuspeitas === undefined ? 'todas' : 'true'
            }
            onValueChange={(value) =>
              setFiltrosRascunho((previous) => ({
                ...previous,
                apenasSuspeitas: value === 'todas' ? undefined : true,
              }))
            }
          >
            <SelectTrigger aria-label='Classificação'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='todas'>Todas</SelectItem>
              <SelectItem value='true'>Suspeitos</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </div>
      <div className='mt-4 flex flex-wrap justify-end gap-2'>
        <Button variant='outline' onClick={limparFiltros}>
          Limpar
        </Button>
        <Button onClick={aplicarFiltros}>Aplicar filtros</Button>
      </div>
    </section>
  );
}

function AuditLogRow({
  log,
  formatarData,
  mutating,
  onRequestReview,
}: {
  log: LogAuditoria;
  formatarData: (data: string) => string;
  mutating: boolean;
  onRequestReview: (log: LogAuditoria) => void;
}) {
  return (
    <tr className={log.suspeita ? 'bg-surface-selected' : ''}>
      <td className='whitespace-nowrap px-4 py-4 text-sm text-clt-2'>
        <div className='flex items-center'>
          <Clock className='mr-2 h-4 w-4 text-clt-1' aria-hidden='true' />
          {formatarData(log.dataHoraUtc)}
        </div>
      </td>
      <td className='whitespace-nowrap px-4 py-4 text-sm text-clt-2'>
        <div className='flex items-center'>
          <User className='mr-2 h-4 w-4 text-clt-1' aria-hidden='true' />
          {log.codigoEvento}
        </div>
      </td>
      <td className='whitespace-nowrap px-4 py-4 text-sm text-clt-2'>
        {log.acao}
      </td>
      <td className='whitespace-nowrap px-4 py-4 text-sm text-clt-2'>
        {log.recurso}
      </td>
      <td className='whitespace-nowrap px-4 py-4 text-sm text-clt-2'>
        {log.origem}
      </td>
      <td className='whitespace-nowrap px-4 py-4'>
        <Badge variant='secondary'>{log.resultado}</Badge>
      </td>
      <td className='whitespace-nowrap px-4 py-4'>
        {log.suspeita ? (
          <Badge variant='destructive'>Suspeito</Badge>
        ) : (
          <Badge variant='secondary'>Normal</Badge>
        )}
      </td>
      <td className='min-w-64 px-4 py-4 text-sm'>
        <div className='flex flex-wrap gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={mutating}
            onClick={() => onRequestReview(log)}
          >
            {log.suspeita ? 'Remover suspeita' : 'Marcar suspeito'}
          </Button>
          <details className='min-w-40 rounded-md border border-borderMy px-2 py-1'>
            <summary className='cursor-pointer font-medium'>
              Histórico e regra
            </summary>
            <AuditLogDetails log={log} formatarData={formatarData} />
          </details>
        </div>
      </td>
    </tr>
  );
}

function AuditLogDetails({
  log,
  formatarData,
}: {
  log: LogAuditoria;
  formatarData: (data: string) => string;
}) {
  return (
    <div className='mt-2 min-w-64 space-y-2 text-sm'>
      <p>Categoria da detecção: {log.categoriaDeteccao || 'Não informada'}</p>
      {log.codigoRegraDeteccao ? (
        <div>
          <p>Regra: {log.codigoRegraDeteccao}</p>
          {log.versaoRegraDeteccao != null ? (
            <p>Versão {log.versaoRegraDeteccao}</p>
          ) : null}
          {log.quantidadeObservadaDeteccao != null ? (
            <p>Observações: {log.quantidadeObservadaDeteccao}</p>
          ) : null}
        </div>
      ) : (
        <p>Este evento não possui uma regra de detecção associada.</p>
      )}
      <h3 className='font-medium'>Histórico de classificação</h3>
      {log.historicoClassificacao.length > 0 ? (
        <ol className='space-y-2'>
          {log.historicoClassificacao.map((revisao) => (
            <li
              key={revisao.numeroRevisao}
              className='rounded border border-borderMy p-2'
            >
              <p>Revisão {revisao.numeroRevisao}</p>
              <p>
                {revisao.suspeitaAnterior ? 'Suspeito' : 'Normal'} →{' '}
                {revisao.suspeitaResultante ? 'Suspeito' : 'Normal'}
              </p>
              <p>{formatarData(revisao.criadaEmUtc)}</p>
              <p>
                Autor:{' '}
                {revisao.autorUsuarioId == null
                  ? 'Sem ator associado'
                  : `ID ${revisao.autorUsuarioId}`}
              </p>
              <p>Origem: {revisao.origem}</p>
              <p>Justificativa registrada</p>
            </li>
          ))}
        </ol>
      ) : (
        <p>Este evento ainda não possui revisões de classificação.</p>
      )}
    </div>
  );
}

function AuditLogTable({
  logs,
  totalLogs,
  totalPaginas,
  paginaAtual,
  loading,
  mutatingLogId,
  setFiltro,
  formatarData,
  onRequestReview,
}: {
  logs: LogAuditoria[];
  totalLogs: number;
  totalPaginas: number;
  paginaAtual: number;
  loading: boolean;
  mutatingLogId: number | null;
  setFiltro: React.Dispatch<React.SetStateAction<FiltroAuditoria>>;
  formatarData: (data: string) => string;
  onRequestReview: (log: LogAuditoria) => void;
}) {
  const headings = [
    'Data/Hora',
    'Evento',
    'Ação',
    'Recurso',
    'Origem',
    'Resultado',
    'Status',
    'Ações',
  ];
  return (
    <section
      aria-label='Logs de auditoria'
      className='mt-7 rounded-xl border border-borderMy bg-surface'
    >
      <div className='border-b border-borderMy p-4'>
        <h2 className='font-rajdhani-medium text-xl text-clt-2'>
          Logs de Auditoria ({totalLogs} registros)
        </h2>
      </div>
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead className='bg-surface-muted'>
            <tr>
              {headings.map((heading) => (
                <th
                  key={heading}
                  className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-clt-1'
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y divide-borderMy bg-surface'>
            {logs.length > 0 ? (
              logs.map((log) => (
                <AuditLogRow
                  key={log.id}
                  log={log}
                  formatarData={formatarData}
                  mutating={mutatingLogId !== null}
                  onRequestReview={onRequestReview}
                />
              ))
            ) : (
              <tr>
                <td colSpan={8} className='px-4 py-8 text-center text-clt-1'>
                  Nenhum evento de auditoria encontrado para os filtros
                  selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className='flex items-center justify-between gap-4 border-t border-borderMy p-4'>
        <span className='text-sm text-clt-1'>
          Página {paginaAtual} de {Math.max(totalPaginas, 1)}
        </span>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            disabled={paginaAtual <= 1 || loading}
            onClick={() =>
              setFiltro((previous) => ({
                ...previous,
                pagina: Math.max(1, (previous.pagina ?? 1) - 1),
              }))
            }
          >
            Anterior
          </Button>
          <Button
            variant='outline'
            disabled={paginaAtual >= totalPaginas || loading}
            onClick={() =>
              setFiltro((previous) => ({
                ...previous,
                pagina: (previous.pagina ?? 1) + 1,
              }))
            }
          >
            Próxima
          </Button>
        </div>
      </div>
    </section>
  );
}

function AuditReviewDialog({
  revisaoPendente,
  setRevisaoPendente,
  justificativa,
  setJustificativa,
  mutatingLogId,
  handleReclassificar,
}: {
  revisaoPendente: RevisaoPendente | null;
  setRevisaoPendente: React.Dispatch<
    React.SetStateAction<RevisaoPendente | null>
  >;
  justificativa: string;
  setJustificativa: React.Dispatch<React.SetStateAction<string>>;
  mutatingLogId: number | null;
  handleReclassificar: () => void;
}) {
  const closeDialog = (open: boolean) => {
    if (open || mutatingLogId !== null) return;
    setRevisaoPendente(null);
    setJustificativa('');
  };
  const cancelReview = () => {
    setRevisaoPendente(null);
    setJustificativa('');
  };

  return (
    <Dialog open={revisaoPendente !== null} onOpenChange={closeDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {revisaoPendente?.suspeitaResultante
              ? 'Marcar como suspeito'
              : 'Remover classificação suspeita'}
          </DialogTitle>
          <DialogDescription>
            Registre a justificativa da revisão. A versão atual será conferida
            antes de salvar.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          aria-label='Justificativa da revisão'
          placeholder='Justificativa da revisão'
          maxLength={1000}
          value={justificativa}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            setJustificativa(event.target.value)
          }
        />
        <DialogFooter>
          <Button
            variant='outline'
            disabled={mutatingLogId !== null}
            onClick={cancelReview}
          >
            Cancelar
          </Button>
          <Button
            disabled={!justificativa.trim() || mutatingLogId !== null}
            onClick={handleReclassificar}
          >
            {mutatingLogId !== null ? 'Salvando...' : 'Salvar revisão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AuditoriaPage() {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [relatorio, setRelatorio] = useState<RelatorioAuditoria | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [filtrosRascunho, setFiltrosRascunho] = useState<FiltroAuditoria>({});
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltroAuditoria>({});
  const [errosDatas, setErrosDatas] = useState<ErrosDataFiltro>({});
  const [filtro, setFiltro] = useState<FiltroAuditoria>(PAGINACAO_INICIAL);
  const [logsError, setLogsError] = useState<unknown>();
  const [reportError, setReportError] = useState<unknown>();
  const [revisaoPendente, setRevisaoPendente] =
    useState<RevisaoPendente | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [mutatingLogId, setMutatingLogId] = useState<number | null>(null);

  const carregarLogs = useCallback(async () => {
    setLoading(true);
    setLogsError(undefined);
    try {
      const resultado = await obterLogsAuditoria(filtro);
      setLogs(resultado.itens ?? []);
      setTotalLogs(resultado.totalItens);
      setTotalPaginas(resultado.totalPaginas);
    } catch (error) {
      setLogs([]);
      setTotalLogs(0);
      setTotalPaginas(0);
      setLogsError(error);
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  const carregarRelatorio = useCallback(async () => {
    setLoadingReport(true);
    setReportError(undefined);
    try {
      setRelatorio(await gerarRelatorioAuditoria(filtrosAplicados));
    } catch (error) {
      setRelatorio(null);
      setReportError(error);
    } finally {
      setLoadingReport(false);
    }
  }, [filtrosAplicados]);

  useEffect(() => {
    void carregarLogs();
  }, [carregarLogs]);

  useEffect(() => {
    void carregarRelatorio();
  }, [carregarRelatorio]);

  const aplicarFiltros = () => {
    const dataInicio = filtrosRascunho.dataInicio
      ? parseCivilDateInput(filtrosRascunho.dataInicio)
      : undefined;
    const dataFim = filtrosRascunho.dataFim
      ? parseCivilDateInput(filtrosRascunho.dataFim)
      : undefined;
    const novosErros: ErrosDataFiltro = {};

    if (filtrosRascunho.dataInicio && !dataInicio) {
      novosErros.dataInicio = `Data inicial inválida. Use ${CIVIL_DATE_INPUT_MASK}.`;
    }
    if (filtrosRascunho.dataFim && !dataFim) {
      novosErros.dataFim = `Data final inválida. Use ${CIVIL_DATE_INPUT_MASK}.`;
    }

    setErrosDatas(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    const filtrosNormalizados = { ...filtrosRascunho, dataInicio, dataFim };
    setFiltrosAplicados(filtrosNormalizados);
    setFiltro({ ...filtrosNormalizados, ...PAGINACAO_INICIAL });
  };

  const limparFiltros = () => {
    setFiltrosRascunho({});
    setFiltrosAplicados({});
    setErrosDatas({});
    setFiltro(PAGINACAO_INICIAL);
  };

  const atualizarDataRascunho = (campo: CampoDataFiltro, valor: string) => {
    setFiltrosRascunho((previous) => ({
      ...previous,
      [campo]: valor || undefined,
    }));
    setErrosDatas((previous) => ({
      ...previous,
      [campo]: undefined,
    }));
  };

  const handleExportar = async () => {
    if (exportando || logsError !== undefined) return;
    setExportando(true);
    try {
      const arquivo = await exportarAuditoria(filtrosAplicados);
      const { saveAs } = await import('file-saver');
      saveAs(arquivo, 'auditoria.csv');
      toast({
        title: 'Exportação concluída',
        description: 'O arquivo CSV da auditoria foi baixado.',
      });
    } catch (error) {
      notifyError(error, OPERATION_IDS.auditExport);
    } finally {
      setExportando(false);
    }
  };

  const handleReclassificar = async () => {
    if (!revisaoPendente || !justificativa.trim() || mutatingLogId !== null)
      return;

    const { log, suspeitaResultante } = revisaoPendente;
    const solicitacao = {
      revisaoEsperada: log.revisaoClassificacao,
      justificativa: justificativa.trim(),
    };
    setMutatingLogId(log.id);
    try {
      if (suspeitaResultante) {
        await marcarLogComoSuspeito(log.id, solicitacao);
      } else {
        await marcarLogComoNaoSuspeito(log.id, solicitacao);
      }
      toast({
        title: 'Revisão registrada',
        description: 'A classificação e o histórico foram atualizados.',
      });
      setRevisaoPendente(null);
      setJustificativa('');
      await Promise.all([carregarLogs(), carregarRelatorio()]);
    } catch (error) {
      notifyError(
        error,
        suspeitaResultante
          ? OPERATION_IDS.markAuditLogSuspicious
          : OPERATION_IDS.markAuditLogNotSuspicious
      );
    } finally {
      setMutatingLogId(null);
    }
  };

  const formatarData = (data: string) => new Date(data).toLocaleString('pt-BR');
  const paginaAtual = filtro.pagina ?? 1;

  if (loading) {
    return (
      <main className='min-h-svh bg-canvas text-clt-2'>
        <div
          role='status'
          className='flex min-h-svh w-full items-center justify-center gap-x-4 bg-canvas font-inter-medium text-clt-2'
        >
          <div className='h-5 w-5 animate-spin rounded-full border-2 border-primaryMy border-t-transparent'>
            <LoadingIcon />
          </div>
          Carregando auditoria...
        </div>
      </main>
    );
  }

  const requestReview = (log: LogAuditoria) => {
    setJustificativa('');
    setRevisaoPendente({ log, suspeitaResultante: !log.suspeita });
  };

  return (
    <main className='mx-auto flex min-h-svh w-full max-w-7xl flex-col overflow-y-auto bg-canvas px-4 pb-12 text-clt-2 sm:px-6 lg:px-8'>
      <div className='flex flex-wrap items-center justify-between gap-4 pt-8'>
        <h1 className='font-rajdhani-medium text-3xl uppercase text-clt-2'>
          <Shield className='mr-2 inline' aria-hidden='true' />
          Auditoria de Segurança
        </h1>
        {!logsError ? (
          <Button
            onClick={() => void handleExportar()}
            disabled={exportando || loading}
          >
            <Download className='mr-2 h-4 w-4' aria-hidden='true' />
            {exportando ? 'Exportando...' : 'Exportar CSV'}
          </Button>
        ) : null}
      </div>

      {logsError ? (
        <div className='mt-7'>
          <ErrorFeedback
            error={logsError}
            operationId={OPERATION_IDS.auditLogs}
            onRetry={() => void carregarLogs()}
          />
        </div>
      ) : null}
      {reportError && !logsError ? (
        <div className='mt-7'>
          <ErrorFeedback
            error={reportError}
            operationId={OPERATION_IDS.auditReport}
            onRetry={() => void carregarRelatorio()}
          />
        </div>
      ) : null}

      <AuditReportCards
        relatorio={relatorio}
        logsError={logsError}
        loadingReport={loadingReport}
      />

      {!logsError ? (
        <>
          <AuditFilters
            filtrosRascunho={filtrosRascunho}
            setFiltrosRascunho={setFiltrosRascunho}
            errosDatas={errosDatas}
            atualizarDataRascunho={atualizarDataRascunho}
            limparFiltros={limparFiltros}
            aplicarFiltros={aplicarFiltros}
          />
          <AuditLogTable
            logs={logs}
            totalLogs={totalLogs}
            totalPaginas={totalPaginas}
            paginaAtual={paginaAtual}
            loading={loading}
            mutatingLogId={mutatingLogId}
            setFiltro={setFiltro}
            formatarData={formatarData}
            onRequestReview={requestReview}
          />
        </>
      ) : null}

      <AuditReviewDialog
        revisaoPendente={revisaoPendente}
        setRevisaoPendente={setRevisaoPendente}
        justificativa={justificativa}
        setJustificativa={setJustificativa}
        mutatingLogId={mutatingLogId}
        handleReclassificar={() => void handleReclassificar()}
      />
    </main>
  );
}
export default AuditoriaPage;
