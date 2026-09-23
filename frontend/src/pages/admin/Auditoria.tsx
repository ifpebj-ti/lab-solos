import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Shield,
  AlertTriangle,
  User,
  MapPin,
  Clock,
  Filter,
} from 'lucide-react';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import {
  obterLogsAuditoria,
  gerarRelatorioAuditoria,
  marcarLogComoSuspeito,
  marcarLogComoNaoSuspeito,
  LogAuditoria,
  FiltroAuditoria,
  RelatorioAuditoria,
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { notifyError } from '@/errors/presentError';

function AuditoriaPage() {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [relatorio, setRelatorio] = useState<RelatorioAuditoria | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroAuditoria>({
    pagina: 1,
    tamanhoPagina: 50,
  });
  const [motivoSuspeita, setMotivoSuspeita] = useState('');
  const [logSelecionado, setLogSelecionado] = useState<number | null>(null);
  const [logsError, setLogsError] = useState<unknown>();
  const [reportError, setReportError] = useState<unknown>();
  const [mutatingLogId, setMutatingLogId] = useState<number | null>(null);

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      setLogsError(undefined);
      setReportError(undefined);
      const [logsResult, reportResult] = await Promise.allSettled([
        obterLogsAuditoria(filtro),
        gerarRelatorioAuditoria(filtro.dataInicio, filtro.dataFim),
      ]);

      if (logsResult.status === 'fulfilled') {
        setLogs(logsResult.value || []);
      } else {
        setLogs([]);
        setLogsError(logsResult.reason);
      }

      if (reportResult.status === 'fulfilled') {
        setRelatorio(reportResult.value);
      } else {
        setRelatorio(null);
        setReportError(reportResult.reason);
      }

      if (
        logsResult.status === 'rejected' &&
        reportResult.status === 'rejected'
      ) {
        toast({
          title: 'Erro',
          description: 'Erro ao carregar dados de auditoria',
          variant: 'destructive',
        });
      }
    } catch {
      setLogs([]);
      setRelatorio(null);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados de auditoria',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleMarcarSuspeito = async () => {
    if (!logSelecionado || !motivoSuspeita.trim()) return;

    if (mutatingLogId !== null) return;
    setMutatingLogId(logSelecionado);
    try {
      await marcarLogComoSuspeito(logSelecionado, motivoSuspeita);
      toast({
        title: 'Sucesso',
        description: 'Log marcado como suspeito',
      });
      await carregarDados();
      setMotivoSuspeita('');
      setLogSelecionado(null);
    } catch (error) {
      notifyError(error, OPERATION_IDS.markAuditLogSuspicious);
    } finally {
      setMutatingLogId(null);
    }
  };

  const handleMarcarNaoSuspeito = async (logId: number) => {
    if (mutatingLogId !== null) return;

    setMutatingLogId(logId);
    try {
      await marcarLogComoNaoSuspeito(logId);
      toast({
        title: 'Sucesso',
        description: 'Log marcado como não suspeito',
      });
      await carregarDados();
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao marcar log como não suspeito',
        variant: 'destructive',
      });
    } finally {
      setMutatingLogId(null);
    }
  };

  const getNivelRiscoBadge = (nivelRisco: string) => {
    const variants = {
      Baixo: 'default',
      Medio: 'secondary',
      Alto: 'destructive',
      Critico: 'destructive',
    } as const;

    return (
      <Badge
        variant={variants[nivelRisco as keyof typeof variants] || 'default'}
      >
        {nivelRisco}
      </Badge>
    );
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR');
  };

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

  return (
    <main className='mx-auto flex min-h-svh w-full max-w-7xl flex-col overflow-y-auto bg-canvas px-4 pb-12 text-clt-2 sm:px-6 lg:px-8'>
      {/* Header */}
      <div className='flex items-center justify-between pt-8'>
        <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
          <Shield className='inline mr-2' />
          Auditoria de Segurança
        </h1>
      </div>

      {/* Cards de Estatísticas */}
      {reportError ? (
        <div className='mt-7'>
          <ErrorFeedback
            error={reportError}
            operationId={OPERATION_IDS.auditReport}
            onRetry={() => void carregarDados()}
          />
        </div>
      ) : relatorio ? (
        <div className='mt-7 grid grid-cols-1 gap-4 md:grid-cols-4'>
          <div className='rounded-xl border border-borderMy bg-surface p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-clt-1'>Total de Logs</p>
                <p className='text-2xl font-bold text-clt-2'>
                  {relatorio?.totalLogs || 0}
                </p>
              </div>
              <Calendar className='h-8 w-8 text-primaryMy' />
            </div>
          </div>

          <div className='rounded-xl border border-borderMy bg-surface p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-clt-1'>Logs Suspeitos</p>
                <p className='text-2xl font-bold text-clt-2'>
                  {relatorio?.logsSuspeitos || 0}
                </p>
              </div>
              <AlertTriangle className='h-8 w-8 text-clt-1' />
            </div>
          </div>

          <div className='rounded-xl border border-borderMy bg-surface p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-clt-1'>Logs Críticos</p>
                <p className='text-2xl font-bold text-danger'>
                  {relatorio?.logsCriticos || 0}
                </p>
              </div>
              <Shield className='h-8 w-8 text-danger' />
            </div>
          </div>

          <div className='rounded-xl border border-borderMy bg-surface p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-clt-1'>IPs Suspeitos</p>
                <p className='text-2xl font-bold text-clt-2'>
                  {relatorio?.ipsSuspeitos?.length || 0}
                </p>
              </div>
              <MapPin className='h-8 w-8 text-primaryMy' />
            </div>
          </div>
        </div>
      ) : null}

      {/* Filtros */}
      <div className='mt-7 flex justify-center rounded-xl border border-borderMy bg-surface p-4'>
        <div className='flex items-center justify-center gap-4 flex-wrap'>
          <div className='flex items-center gap-2'>
            <Filter className='h-4 w-4' />
            <span className='font-medium'>Filtros:</span>
          </div>

          <Select
            onValueChange={(value) =>
              setFiltro((prev) => ({
                ...prev,
                nivelRisco: value === 'todos' ? undefined : value,
              }))
            }
          >
            <SelectTrigger className='w-35'>
              <SelectValue placeholder='Nível de Risco' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='todos'>Todos</SelectItem>
              <SelectItem value='Baixo'>Baixo</SelectItem>
              <SelectItem value='Medio'>Médio</SelectItem>
              <SelectItem value='Alto'>Alto</SelectItem>
              <SelectItem value='Critico'>Crítico</SelectItem>
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value) =>
              setFiltro((prev) => ({
                ...prev,
                apenasSuspeitas: value === 'true',
              }))
            }
          >
            <SelectTrigger className='w-35'>
              <SelectValue placeholder='Tipo' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='false'>Todos</SelectItem>
              <SelectItem value='true'>Apenas Suspeitos</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type='date'
            placeholder='Data Início'
            className='w-33'
            onChange={(e) =>
              setFiltro((prev) => ({ ...prev, dataInicio: e.target.value }))
            }
          />

          <Input
            type='date'
            placeholder='Data Fim'
            className='w-33'
            onChange={(e) =>
              setFiltro((prev) => ({ ...prev, dataFim: e.target.value }))
            }
          />

          <Button onClick={carregarDados} variant='outline'>
            Aplicar Filtros
          </Button>
        </div>
      </div>

      {/* Tabela de Logs */}
      <section
        aria-label='Logs de auditoria'
        className='mt-7 rounded-xl border border-borderMy bg-surface'
      >
        <div className='p-4 border-b border-borderMy'>
          <h2 className='font-rajdhani-medium text-xl text-clt-2'>
            Logs de Auditoria ({logs.length} registros)
          </h2>
        </div>

        {logsError ? (
          <div className='p-4'>
            <ErrorFeedback
              error={logsError}
              operationId={OPERATION_IDS.auditLogs}
              onRetry={() => void carregarDados()}
            />
          </div>
        ) : null}
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-surface-muted'>
              <tr>
                <th className='px-4 py-3 text-left text-xs font-medium text-clt-1 uppercase tracking-wider'>
                  Data/Hora
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-clt-1 uppercase tracking-wider'>
                  Usuário
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-clt-1 uppercase tracking-wider'>
                  Ação
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-clt-1 uppercase tracking-wider'>
                  Recurso
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-clt-1 uppercase tracking-wider'>
                  IP
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-clt-1 uppercase tracking-wider'>
                  Risco
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-clt-1 uppercase tracking-wider'>
                  Status
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-clt-1 uppercase tracking-wider'>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-borderMy bg-surface'>
              {!logsError && logs && logs.length > 0 ? (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className={log.suspeita ? 'bg-surface-selected' : ''}
                  >
                    <td className='px-4 py-4 whitespace-nowrap text-sm text-clt-2'>
                      <div className='flex items-center'>
                        <Clock className='mr-2 h-4 w-4 text-clt-1' />
                        {formatarData(log.dataHora)}
                      </div>
                    </td>
                    <td className='px-4 py-4 whitespace-nowrap text-sm text-clt-2'>
                      <div className='flex items-center'>
                        <User className='mr-2 h-4 w-4 text-clt-1' />
                        {log.nomeUsuario || 'Anônimo'}
                      </div>
                    </td>
                    <td className='px-4 py-4 whitespace-nowrap text-sm text-clt-2'>
                      {log.acao}
                    </td>
                    <td className='px-4 py-4 whitespace-nowrap text-sm text-clt-2'>
                      {log.recurso}
                    </td>
                    <td className='px-4 py-4 whitespace-nowrap text-sm text-clt-2'>
                      <div className='flex items-center'>
                        <MapPin className='mr-2 h-4 w-4 text-clt-1' />
                        {log.enderecoIP}
                      </div>
                    </td>
                    <td className='px-4 py-4 whitespace-nowrap'>
                      {getNivelRiscoBadge(log.nivelRisco)}
                    </td>
                    <td className='px-4 py-4 whitespace-nowrap'>
                      {log.suspeita ? (
                        <Badge variant='destructive'>Suspeito</Badge>
                      ) : (
                        <Badge variant='secondary'>Normal</Badge>
                      )}
                    </td>
                    <td className='px-4 py-4 whitespace-nowrap text-sm font-medium'>
                      <div className='flex space-x-2'>
                        {!log.suspeita ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant='outline'
                                size='sm'
                                disabled={mutatingLogId !== null}
                                onClick={() => setLogSelecionado(log.id)}
                              >
                                Marcar Suspeito
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Marcar como Suspeito</DialogTitle>
                                <DialogDescription>
                                  Informe o motivo pelo qual este log é
                                  considerado suspeito.
                                </DialogDescription>
                              </DialogHeader>
                              <Textarea
                                placeholder='Motivo da suspeita...'
                                value={motivoSuspeita}
                                onChange={(
                                  e: React.ChangeEvent<HTMLTextAreaElement>
                                ) => setMotivoSuspeita(e.target.value)}
                              />
                              <div className='flex justify-end space-x-2'>
                                <Button
                                  variant='outline'
                                  onClick={() => {
                                    setMotivoSuspeita('');
                                    setLogSelecionado(null);
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  onClick={handleMarcarSuspeito}
                                  disabled={mutatingLogId !== null}
                                >
                                  Marcar
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <Button
                            variant='outline'
                            size='sm'
                            disabled={mutatingLogId !== null}
                            onClick={() => handleMarcarNaoSuspeito(log.id)}
                          >
                            Remover Suspeita
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className='px-4 py-8 text-center text-clt-1'>
                    Nenhum log encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default AuditoriaPage;
