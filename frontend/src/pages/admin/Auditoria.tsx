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

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      const [logsData, relatorioData] = await Promise.all([
        obterLogsAuditoria(filtro),
        gerarRelatorioAuditoria(filtro.dataInicio, filtro.dataFim),
      ]);

      setLogs(logsData || []);
      setRelatorio(relatorioData);
    } catch (error) {
      console.error('Erro ao carregar dados de auditoria:', error);
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

    try {
      await marcarLogComoSuspeito(logSelecionado, motivoSuspeita);
      toast({
        title: 'Sucesso',
        description: 'Log marcado como suspeito',
      });
      carregarDados();
      setMotivoSuspeita('');
      setLogSelecionado(null);
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao marcar log como suspeito',
        variant: 'destructive',
      });
    }
  };

  const handleMarcarNaoSuspeito = async (logId: number) => {
    try {
      await marcarLogComoNaoSuspeito(logId);
      toast({
        title: 'Sucesso',
        description: 'Log marcado como não suspeito',
      });
      carregarDados();
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao marcar log como não suspeito',
        variant: 'destructive',
      });
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
      <div className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2 bg-backgroundMy'>
        <div className='animate-spin'>
          <LoadingIcon />
        </div>
        Carregando auditoria...
      </div>
    );
  }

  return (
    <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy pb-9'>
      {/* Header */}
      <div className='w-11/12 flex items-center justify-between mt-7'>
        <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
          <Shield className='inline mr-2' />
          Auditoria de Segurança
        </h1>
      </div>

      {/* Cards de Estatísticas */}
      {relatorio && (
        <div className='w-11/12 grid grid-cols-1 md:grid-cols-4 gap-4 mt-7'>
          <div className='bg-white p-4 rounded-lg border border-borderMy'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-600'>Total de Logs</p>
                <p className='text-2xl font-bold text-clt-2'>
                  {relatorio?.totalLogs || 0}
                </p>
              </div>
              <Calendar className='h-8 w-8 text-blue-500' />
            </div>
          </div>

          <div className='bg-white p-4 rounded-lg border border-borderMy'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-600'>Logs Suspeitos</p>
                <p className='text-2xl font-bold text-yellow-600'>
                  {relatorio?.logsSuspeitos || 0}
                </p>
              </div>
              <AlertTriangle className='h-8 w-8 text-yellow-500' />
            </div>
          </div>

          <div className='bg-white p-4 rounded-lg border border-borderMy'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-600'>Logs Críticos</p>
                <p className='text-2xl font-bold text-red-600'>
                  {relatorio?.logsCriticos || 0}
                </p>
              </div>
              <Shield className='h-8 w-8 text-red-500' />
            </div>
          </div>

          <div className='bg-white p-4 rounded-lg border border-borderMy'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-600'>IPs Suspeitos</p>
                <p className='text-2xl font-bold text-orange-600'>
                  {relatorio?.ipsSuspeitos?.length || 0}
                </p>
              </div>
              <MapPin className='h-8 w-8 text-orange-500' />
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className='w-11/12 flex justify-center bg-white p-4 rounded-lg border border-borderMy mt-7'>
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
      <div className='w-11/12 bg-white rounded-lg border border-borderMy mt-7'>
        <div className='p-4 border-b border-borderMy'>
          <h2 className='font-rajdhani-medium text-xl text-clt-2'>
            Logs de Auditoria ({logs.length} registros)
          </h2>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Data/Hora
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Usuário
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Ação
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Recurso
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  IP
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Risco
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Status
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {logs && logs.length > 0 ? (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className={log.suspeita ? 'bg-yellow-50' : ''}
                  >
                    <td className='px-4 py-4 whitespace-nowrap text-sm text-gray-900'>
                      <div className='flex items-center'>
                        <Clock className='h-4 w-4 mr-2 text-gray-400' />
                        {formatarData(log.dataHora)}
                      </div>
                    </td>
                    <td className='px-4 py-4 whitespace-nowrap text-sm text-gray-900'>
                      <div className='flex items-center'>
                        <User className='h-4 w-4 mr-2 text-gray-400' />
                        {log.nomeUsuario || 'Anônimo'}
                      </div>
                    </td>
                    <td className='px-4 py-4 whitespace-nowrap text-sm text-gray-900'>
                      {log.acao}
                    </td>
                    <td className='px-4 py-4 whitespace-nowrap text-sm text-gray-900'>
                      {log.recurso}
                    </td>
                    <td className='px-4 py-4 whitespace-nowrap text-sm text-gray-900'>
                      <div className='flex items-center'>
                        <MapPin className='h-4 w-4 mr-2 text-gray-400' />
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
                                <Button onClick={handleMarcarSuspeito}>
                                  Marcar
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <Button
                            variant='outline'
                            size='sm'
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
                  <td
                    colSpan={7}
                    className='px-4 py-8 text-center text-gray-500'
                  >
                    {loading ? 'Carregando logs...' : 'Nenhum log encontrado'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AuditoriaPage;
