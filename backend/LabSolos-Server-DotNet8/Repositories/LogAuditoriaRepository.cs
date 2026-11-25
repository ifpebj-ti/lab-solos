using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.DTOs.Paginacao;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Data;
using LabSolos_Server_DotNet8.Services;

namespace LabSolos_Server_DotNet8.Repositories
{
    public class LogAuditoriaRepository : Repository<LogAuditoria>, ILogAuditoriaRepository
    {
        public LogAuditoriaRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<LogAuditoria>> ObterLogsFiltradosAsync(FiltroAuditoriaDTO filtro)
        {
            var query = _context.LogsAuditoria
                .Include(l => l.Usuario)
                .Include(l => l.RevisoesClassificacao.OrderBy(revision => revision.NumeroRevisao))
                .AsQueryable();

            query = AplicarFiltros(query, filtro);

            return await query
                .OrderByDescending(l => l.DataHora)
                .Skip((filtro.Pagina - 1) * filtro.TamanhoPagina)
                .Take(filtro.TamanhoPagina)
                .ToListAsync();
        }

        public async Task<int> ObterTotalLogsFiltradosAsync(FiltroAuditoriaDTO filtro)
        {
            var query = AplicarFiltros(_context.LogsAuditoria.AsQueryable(), filtro);

            return await query.CountAsync();
        }

        public Task<int> ContarFalhasLoginPorContaAsync(
            int usuarioId,
            DateTime inicioInclusivo,
            DateTime fimExclusivo) =>
            _context.LogsAuditoria.CountAsync(log =>
                log.UsuarioId == usuarioId &&
                log.TipoAcao == TipoAcaoAuditoria.LoginFalhado &&
                log.DataHora >= inicioInclusivo &&
                log.DataHora < fimExclusivo);

        public Task<int> ContarFalhasLoginPorOrigemAsync(
            string enderecoIp,
            DateTime inicioInclusivo,
            DateTime fimExclusivo) =>
            _context.LogsAuditoria.CountAsync(log =>
                log.EnderecoIP == enderecoIp &&
                log.TipoAcao == TipoAcaoAuditoria.LoginFalhado &&
                log.DataHora >= inicioInclusivo &&
                log.DataHora < fimExclusivo);

        public async Task<ResultadoPaginado<LogAuditoria>> ObterPaginaFiltradaAsync(
            FiltroAuditoriaDTO filtro,
            ParametrosPaginacao parametros,
            CancellationToken cancellationToken)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(
                IsolationLevel.RepeatableRead,
                cancellationToken);
            try
            {
                var query = AplicarFiltros(_context.LogsAuditoria.AsNoTracking(), filtro);
                var totalItens = await query.LongCountAsync(cancellationToken);
                var itens = await query
                    .Include(log => log.RevisoesClassificacao.OrderBy(revision => revision.NumeroRevisao))
                    .OrderByDescending(log => log.DataHora)
                    .ThenByDescending(log => log.Id)
                    .Skip(parametros.Deslocamento)
                    .Take(parametros.TamanhoPagina)
                    .ToListAsync(cancellationToken);

                await transaction.CommitAsync(cancellationToken);
                return ResultadoPaginado.Criar(
                    itens,
                    parametros.Pagina,
                    parametros.TamanhoPagina,
                    totalItens);
            }
            catch
            {
                await transaction.RollbackAsync(CancellationToken.None);
                throw;
            }
        }

        public async Task<RelatorioAuditoriaDTO> GerarRelatorioFiltradoAsync(
            FiltroAuditoriaDTO filtro,
            CancellationToken cancellationToken)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(
                IsolationLevel.RepeatableRead,
                cancellationToken);
            try
            {
                var query = AplicarFiltros(_context.LogsAuditoria.AsNoTracking(), filtro);
                var relatorio = new RelatorioAuditoriaDTO
                {
                    TotalLogs = await query.CountAsync(cancellationToken),
                    LogsSuspeitos = await query.CountAsync(log => log.Suspeita, cancellationToken),
                    LogsCriticos = await query.CountAsync(
                        log => log.NivelRisco == NivelRiscoAuditoria.Critico,
                        cancellationToken)
                };

                var porTipo = await query
                    .GroupBy(log => log.TipoAcao)
                    .Select(group => new { Tipo = group.Key, Quantidade = group.Count() })
                    .ToListAsync(cancellationToken);
                relatorio.LogsPorTipo = porTipo.ToDictionary(
                    item => item.Tipo.ToString(),
                    item => item.Quantidade,
                    StringComparer.Ordinal);

                relatorio.LogsPorDia = await query
                    .GroupBy(log => log.DataHora.Date)
                    .Select(group => new { Data = group.Key, Quantidade = group.Count() })
                    .OrderBy(item => item.Data)
                    .ToDictionaryAsync(item => item.Data, item => item.Quantidade, cancellationToken);

                var ultimosSuspeitos = await query
                    .Where(log => log.Suspeita)
                    .Include(log => log.RevisoesClassificacao.OrderBy(revision => revision.NumeroRevisao))
                    .OrderByDescending(log => log.DataHora)
                    .ThenByDescending(log => log.Id)
                    .Take(100)
                    .ToListAsync(cancellationToken);
                relatorio.UltimosLogsSuspeitos = ultimosSuspeitos
                    .Select(AuditQueryPolicy.Project)
                    .ToList();

                await transaction.CommitAsync(cancellationToken);
                return relatorio;
            }
            catch
            {
                await transaction.RollbackAsync(CancellationToken.None);
                throw;
            }
        }

        public async Task<(long TotalItens, IReadOnlyList<LogAuditoria> Itens)> ObterRecorteExportacaoAsync(
            FiltroAuditoriaDTO filtro,
            int limite,
            CancellationToken cancellationToken)
        {
            ArgumentOutOfRangeException.ThrowIfNegativeOrZero(limite);
            await using var transaction = await _context.Database.BeginTransactionAsync(
                IsolationLevel.RepeatableRead,
                cancellationToken);
            try
            {
                var query = AplicarFiltros(_context.LogsAuditoria.AsNoTracking(), filtro);
                var totalItens = await query.LongCountAsync(cancellationToken);
                if (totalItens > limite)
                {
                    await transaction.CommitAsync(cancellationToken);
                    return (totalItens, Array.Empty<LogAuditoria>());
                }

                var itens = await query
                    .Include(log => log.RevisoesClassificacao.OrderBy(revision => revision.NumeroRevisao))
                    .OrderByDescending(log => log.DataHora)
                    .ThenByDescending(log => log.Id)
                    .Take(limite)
                    .ToListAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
                return (totalItens, itens);
            }
            catch
            {
                await transaction.RollbackAsync(CancellationToken.None);
                throw;
            }
        }

        private static IQueryable<LogAuditoria> AplicarFiltros(
            IQueryable<LogAuditoria> query,
            FiltroAuditoriaDTO filtro)
        {
            if (filtro.DataInicio is { } dataInicio)
                query = query.Where(l => l.DataHora >= dataInicio);

            if (filtro.DataFim is { } dataFim)
                query = query.Where(l => l.DataHora < dataFim);

            if (filtro.UsuarioId is { } usuarioId)
                query = query.Where(l => l.UsuarioId == usuarioId);

            if (filtro.TipoAcao is { } tipoAcao)
                query = query.Where(l => l.TipoAcao == tipoAcao);

            if (filtro.NivelRisco is { } nivelRisco)
                query = query.Where(l => l.NivelRisco == nivelRisco);

            if (filtro.ApenasSuspeitas == true)
                query = query.Where(l => l.Suspeita);

            if (!string.IsNullOrEmpty(filtro.EnderecoIP))
                query = query.Where(l => l.EnderecoIP.Contains(filtro.EnderecoIP));

            if (!string.IsNullOrEmpty(filtro.Recurso))
                query = query.Where(l => l.Recurso.Contains(filtro.Recurso));

            return query;
        }

        public async Task<IEnumerable<LogAuditoria>> ObterLogsSuspeitosAsync(int limite = 50)
        {
            return await _context.LogsAuditoria
                .Include(l => l.Usuario)
                .Where(l => l.Suspeita)
                .OrderByDescending(l => l.DataHora)
                .Take(limite)
                .ToListAsync();
        }

        public async Task<Dictionary<string, int>> ObterEstatisticasPorTipoAsync(DateTime dataInicio, DateTime dataFim)
        {
            return await _context.LogsAuditoria
                .Where(l => l.DataHora >= dataInicio && l.DataHora < dataFim)
                .GroupBy(l => l.TipoAcao)
                .Select(g => new { Tipo = g.Key.ToString(), Count = g.Count() })
                .ToDictionaryAsync(x => x.Tipo, x => x.Count);
        }

        public async Task<Dictionary<string, int>> ObterEstatisticasPorUsuarioAsync(DateTime dataInicio, DateTime dataFim)
        {
            return await _context.LogsAuditoria
                .Include(l => l.Usuario)
                .Where(l => l.DataHora >= dataInicio && l.DataHora < dataFim && l.Usuario != null)
                .GroupBy(l => l.Usuario!.NomeCompleto)
                .Select(g => new { Nome = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(10)
                .ToDictionaryAsync(x => x.Nome, x => x.Count);
        }

        public async Task<Dictionary<string, int>> ObterEstatisticasPorIPAsync(DateTime dataInicio, DateTime dataFim)
        {
            return await _context.LogsAuditoria
                .Where(l => l.DataHora >= dataInicio && l.DataHora < dataFim)
                .GroupBy(l => l.EnderecoIP)
                .Select(g => new { IP = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(10)
                .ToDictionaryAsync(x => x.IP, x => x.Count);
        }

        public async Task<List<string>> ObterUsuariosComMaisAcessosAsync(int limite = 10)
        {
            var ultimaHora = DateTime.UtcNow.AddHours(-1);

            return await _context.LogsAuditoria
                .Include(l => l.Usuario)
                .Where(l => l.DataHora >= ultimaHora && l.Usuario != null)
                .GroupBy(l => l.Usuario!.NomeCompleto)
                .OrderByDescending(g => g.Count())
                .Take(limite)
                .Select(g => g.Key)
                .ToListAsync();
        }

        public async Task<Dictionary<DateTime, int>> ObterLogsPorDiaAsync(DateTime dataInicio, DateTime dataFim)
        {
            return await _context.LogsAuditoria
                .Where(l => l.DataHora >= dataInicio && l.DataHora < dataFim)
                .GroupBy(l => l.DataHora.Date)
                .Select(g => new { Data = g.Key, Count = g.Count() })
                .OrderBy(x => x.Data)
                .ToDictionaryAsync(x => x.Data, x => x.Count);
        }

        public async Task<AuditClassificationRevision?> ReclassificarAsync(
            int logId,
            int autorUsuarioId,
            int revisaoEsperada,
            bool suspeitaResultante,
            string justificativa,
            DateTimeOffset criadaEmUtc)
        {
            var log = await _context.LogsAuditoria.SingleOrDefaultAsync(item => item.Id == logId);
            if (log is null)
                return null;

            if (log.RevisaoClassificacao != revisaoEsperada || log.Suspeita == suspeitaResultante)
                throw new DbUpdateConcurrencyException("A revisão de classificação está desatualizada.");

            var revision = new AuditClassificationRevision
            {
                LogAuditoriaId = log.Id,
                NumeroRevisao = checked(log.RevisaoClassificacao + 1),
                SuspeitaAnterior = log.Suspeita,
                SuspeitaResultante = suspeitaResultante,
                Justificativa = justificativa,
                CriadaEmUtc = criadaEmUtc.ToUniversalTime(),
                AutorUsuarioId = autorUsuarioId,
                Origem = AuditClassificationRevisionOrigin.RevisaoManual
            };

            log.Suspeita = suspeitaResultante;
            log.MotivoSuspeita = justificativa;
            log.RevisaoClassificacao = revision.NumeroRevisao;
            _context.AuditClassificationRevisions.Add(revision);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException exception) when (IsClassificationRevisionUniqueViolation(exception))
            {
                throw new DbUpdateConcurrencyException("A revisão de classificação já foi registrada.", exception);
            }

            return revision;
        }

        private static bool IsClassificationRevisionUniqueViolation(DbUpdateException exception) =>
            exception.InnerException is PostgresException
            {
                SqlState: PostgresErrorCodes.UniqueViolation,
                ConstraintName: "UX_AuditClassificationRevisions_Log_Revision"
            };
    }
}
