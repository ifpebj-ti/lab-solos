using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Repositories
{
    public interface INotificacaoRepository : IRepository<Notificacao>
    {
        Task<IReadOnlyList<NotificacaoLeitura>> ObterPorDestinatarioAsync(int usuarioId, bool apenasNaoLidas = false);
        Task<NotificacaoLeitura?> ObterParaDestinatarioAsync(int notificacaoId, int usuarioId);
        Task<int> ContarNaoLidasPorDestinatarioAsync(int usuarioId);
        Task<int[]> ObterDestinatariosHabilitadosAsync(int? usuarioId, NivelUsuario? nivelUsuario);
        Task<Notificacao?> ObterPorChaveIdempotenciaAsync(string chaveIdempotencia);
        Task BloquearChaveIdempotenciaAsync(string chaveIdempotencia);
        Task<Notificacao?> ObterPorIdIncluindoExcluidasAsync(int notificacaoId);
        Task<bool> ExcluirLogicamenteAsync(int notificacaoId, DateTime dataExclusaoUtc);
        Task<bool> MarcarComoLidaAsync(int notificacaoId, int usuarioId, DateTime dataLeituraUtc);
        Task<int> MarcarVariasComoLidaAsync(int[] notificacaoIds, int usuarioId, DateTime dataLeituraUtc);
        Task<IEnumerable<Notificacao>> ObterPorTipoAsync(TipoNotificacao tipo, bool apenasNaoLidas = false);
    }

    public class NotificacaoRepository : Repository<Notificacao>, INotificacaoRepository
    {
        public NotificacaoRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IReadOnlyList<NotificacaoLeitura>> ObterPorDestinatarioAsync(
            int usuarioId,
            bool apenasNaoLidas = false)
        {
            var query = _context.Set<NotificacaoLeitura>()
                .AsNoTracking()
                .Include(read => read.Notificacao)
                .Where(read => read.UsuarioId == usuarioId && read.Notificacao.ExcluidaEmUtc == null);

            if (apenasNaoLidas)
                query = query.Where(read => !read.Lida);

            return await query
                .OrderByDescending(read => read.Notificacao.DataCriacao)
                .ThenByDescending(read => read.NotificacaoId)
                .ToListAsync();
        }

        public Task<NotificacaoLeitura?> ObterParaDestinatarioAsync(int notificacaoId, int usuarioId)
        {
            return _context.Set<NotificacaoLeitura>()
                .AsNoTracking()
                .Include(read => read.Notificacao)
                .SingleOrDefaultAsync(read =>
                    read.NotificacaoId == notificacaoId
                    && read.UsuarioId == usuarioId
                    && read.Notificacao.ExcluidaEmUtc == null);
        }

        public Task<int> ContarNaoLidasPorDestinatarioAsync(int usuarioId)
        {
            return _context.Set<NotificacaoLeitura>()
                .CountAsync(read => read.UsuarioId == usuarioId
                    && !read.Lida
                    && read.Notificacao.ExcluidaEmUtc == null);
        }

        public Task<int[]> ObterDestinatariosHabilitadosAsync(int? usuarioId, NivelUsuario? nivelUsuario)
        {
            var query = _context.Usuarios.Where(user => user.Status == StatusUsuario.Habilitado);
            if (usuarioId is int destinatarioId)
            {
                query = query.Where(user => user.Id == destinatarioId);
            }
            else if (nivelUsuario is NivelUsuario nivelDestino)
            {
                query = query.Where(user => user.NivelUsuario == nivelDestino);
            }

            return query
                .OrderBy(user => user.Id)
                .Select(user => user.Id)
                .ToArrayAsync();
        }

        public Task<Notificacao?> ObterPorChaveIdempotenciaAsync(string chaveIdempotencia)
        {
            return _context.Notificacoes
                .AsNoTracking()
                .Include(notification => notification.Destinatarios)
                .SingleOrDefaultAsync(notification => notification.ChaveIdempotencia == chaveIdempotencia);
        }

        public async Task BloquearChaveIdempotenciaAsync(string chaveIdempotencia)
        {
            await _context.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT pg_advisory_xact_lock(hashtextextended({chaveIdempotencia}, 0))");
        }

        public Task<Notificacao?> ObterPorIdIncluindoExcluidasAsync(int notificacaoId)
        {
            return _context.Notificacoes
                .SingleOrDefaultAsync(notification => notification.Id == notificacaoId);
        }

        public async Task<bool> ExcluirLogicamenteAsync(int notificacaoId, DateTime dataExclusaoUtc)
        {
            var notification = await _context.Notificacoes
                .SingleOrDefaultAsync(item => item.Id == notificacaoId && item.ExcluidaEmUtc == null);
            if (notification is null)
            {
                return false;
            }

            notification.ExcluidaEmUtc = DateTime.SpecifyKind(dataExclusaoUtc, DateTimeKind.Utc);
            return true;
        }

        public async Task<bool> MarcarComoLidaAsync(int notificacaoId, int usuarioId, DateTime dataLeituraUtc)
        {
            var recipientRead = _context.Set<NotificacaoLeitura>()
                .Where(read => read.NotificacaoId == notificacaoId
                    && read.UsuarioId == usuarioId
                    && read.Notificacao.ExcluidaEmUtc == null);
            if (!await recipientRead.AnyAsync())
            {
                return false;
            }

            await recipientRead
                .Where(read => !read.Lida)
                .ExecuteUpdateAsync(update => update
                    .SetProperty(read => read.Lida, true)
                    .SetProperty(read => read.DataLeitura, read => read.DataLeitura ?? dataLeituraUtc));
            return true;
        }

        public async Task<int> MarcarVariasComoLidaAsync(
            int[] notificacaoIds,
            int usuarioId,
            DateTime dataLeituraUtc)
        {
            var uniqueIds = notificacaoIds.Distinct().ToArray();
            if (uniqueIds.Length == 0)
            {
                return 0;
            }

            var recipientReads = _context.Set<NotificacaoLeitura>()
                .Where(read => read.UsuarioId == usuarioId
                    && uniqueIds.Contains(read.NotificacaoId)
                    && read.Notificacao.ExcluidaEmUtc == null);
            var eligibleCount = await recipientReads
                .Select(read => read.NotificacaoId)
                .Distinct()
                .CountAsync();
            if (eligibleCount != uniqueIds.Length)
            {
                throw new UnauthorizedAccessException("A solicitação não pode ser concluída.");
            }

            await recipientReads
                .Where(read => !read.Lida)
                .ExecuteUpdateAsync(update => update
                    .SetProperty(read => read.Lida, true)
                    .SetProperty(read => read.DataLeitura, read => read.DataLeitura ?? dataLeituraUtc));
            return uniqueIds.Length;
        }

        public async Task<IEnumerable<Notificacao>> ObterPorTipoAsync(TipoNotificacao tipo, bool apenasNaoLidas = false)
        {
            var query = _context.Set<Notificacao>().Where(n => n.Tipo == tipo && n.ExcluidaEmUtc == null);

            if (apenasNaoLidas)
                query = query.Where(n => !n.Lida);

            return await query.OrderByDescending(n => n.DataCriacao).ToListAsync();
        }
    }
}
