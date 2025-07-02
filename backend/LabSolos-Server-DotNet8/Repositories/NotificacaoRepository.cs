using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Repositories
{
    public interface INotificacaoRepository : IRepository<Notificacao>
    {
        Task<IEnumerable<Notificacao>> ObterPorUsuarioAsync(int usuarioId, bool apenasNaoLidas = false);
        Task<IEnumerable<Notificacao>> ObterGlobaisAsync(bool apenasNaoLidas = false);
        Task<int> ContarNaoLidasPorUsuarioAsync(int usuarioId);
        Task<int> ContarNaoLidasGlobaisAsync();
        Task<Notificacao?> ObterPorIdAsync(int id);
        Task MarcarComoLidaAsync(int notificacaoId);
        Task MarcarVariasComoLidaAsync(int[] notificacaoIds);
        Task<IEnumerable<Notificacao>> ObterPorTipoAsync(TipoNotificacao tipo, bool apenasNaoLidas = false);
    }

    public class NotificacaoRepository : Repository<Notificacao>, INotificacaoRepository
    {
        public NotificacaoRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<Notificacao>> ObterPorUsuarioAsync(int usuarioId, bool apenasNaoLidas = false)
        {
            var query = _context.Set<Notificacao>().Where(n => n.UsuarioId == usuarioId);

            if (apenasNaoLidas)
                query = query.Where(n => !n.Lida);

            return await query.OrderByDescending(n => n.DataCriacao).ToListAsync();
        }

        public async Task<IEnumerable<Notificacao>> ObterGlobaisAsync(bool apenasNaoLidas = false)
        {
            var query = _context.Set<Notificacao>().Where(n => n.UsuarioId == null);

            if (apenasNaoLidas)
                query = query.Where(n => !n.Lida);

            return await query.OrderByDescending(n => n.DataCriacao).ToListAsync();
        }

        public async Task<int> ContarNaoLidasPorUsuarioAsync(int usuarioId)
        {
            return await _context.Set<Notificacao>()
                .CountAsync(n => n.UsuarioId == usuarioId && !n.Lida);
        }

        public async Task<int> ContarNaoLidasGlobaisAsync()
        {
            return await _context.Set<Notificacao>()
                .CountAsync(n => n.UsuarioId == null && !n.Lida);
        }

        public async Task<Notificacao?> ObterPorIdAsync(int id)
        {
            return await _context.Set<Notificacao>().FindAsync(id);
        }

        public async Task MarcarComoLidaAsync(int notificacaoId)
        {
            var notificacao = await _context.Set<Notificacao>().FindAsync(notificacaoId);
            if (notificacao != null && !notificacao.Lida)
            {
                notificacao.Lida = true;
                notificacao.DataLeitura = DateTime.UtcNow;
                _context.Set<Notificacao>().Update(notificacao);
            }
        }

        public async Task MarcarVariasComoLidaAsync(int[] notificacaoIds)
        {
            var notificacoes = await _context.Set<Notificacao>()
                .Where(n => notificacaoIds.Contains(n.Id) && !n.Lida)
                .ToListAsync();

            foreach (var notificacao in notificacoes)
            {
                notificacao.Lida = true;
                notificacao.DataLeitura = DateTime.UtcNow;
            }

            _context.Set<Notificacao>().UpdateRange(notificacoes);
        }

        public async Task<IEnumerable<Notificacao>> ObterPorTipoAsync(TipoNotificacao tipo, bool apenasNaoLidas = false)
        {
            var query = _context.Set<Notificacao>().Where(n => n.Tipo == tipo);

            if (apenasNaoLidas)
                query = query.Where(n => !n.Lida);

            return await query.OrderByDescending(n => n.DataCriacao).ToListAsync();
        }
    }
}
