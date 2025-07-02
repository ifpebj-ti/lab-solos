using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;
using Microsoft.EntityFrameworkCore;

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
                .AsQueryable();

            if (filtro.DataInicio.HasValue)
                query = query.Where(l => l.DataHora >= filtro.DataInicio.Value);

            if (filtro.DataFim.HasValue)
                query = query.Where(l => l.DataHora <= filtro.DataFim.Value);

            if (filtro.UsuarioId.HasValue)
                query = query.Where(l => l.UsuarioId == filtro.UsuarioId.Value);

            if (filtro.TipoAcao.HasValue)
                query = query.Where(l => l.TipoAcao == filtro.TipoAcao.Value);

            if (filtro.NivelRisco.HasValue)
                query = query.Where(l => l.NivelRisco == filtro.NivelRisco.Value);

            if (filtro.ApenasSuspeitas == true)
                query = query.Where(l => l.Suspeita);

            if (!string.IsNullOrEmpty(filtro.EnderecoIP))
                query = query.Where(l => l.EnderecoIP.Contains(filtro.EnderecoIP));

            if (!string.IsNullOrEmpty(filtro.Recurso))
                query = query.Where(l => l.Recurso.Contains(filtro.Recurso));

            return await query
                .OrderByDescending(l => l.DataHora)
                .Skip((filtro.Pagina - 1) * filtro.TamanhoPagina)
                .Take(filtro.TamanhoPagina)
                .ToListAsync();
        }

        public async Task<int> ObterTotalLogsFiltradosAsync(FiltroAuditoriaDTO filtro)
        {
            var query = _context.LogsAuditoria.AsQueryable();

            if (filtro.DataInicio.HasValue)
                query = query.Where(l => l.DataHora >= filtro.DataInicio.Value);

            if (filtro.DataFim.HasValue)
                query = query.Where(l => l.DataHora <= filtro.DataFim.Value);

            if (filtro.UsuarioId.HasValue)
                query = query.Where(l => l.UsuarioId == filtro.UsuarioId.Value);

            if (filtro.TipoAcao.HasValue)
                query = query.Where(l => l.TipoAcao == filtro.TipoAcao.Value);

            if (filtro.NivelRisco.HasValue)
                query = query.Where(l => l.NivelRisco == filtro.NivelRisco.Value);

            if (filtro.ApenasSuspeitas == true)
                query = query.Where(l => l.Suspeita);

            if (!string.IsNullOrEmpty(filtro.EnderecoIP))
                query = query.Where(l => l.EnderecoIP.Contains(filtro.EnderecoIP));

            if (!string.IsNullOrEmpty(filtro.Recurso))
                query = query.Where(l => l.Recurso.Contains(filtro.Recurso));

            return await query.CountAsync();
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
                .Where(l => l.DataHora >= dataInicio && l.DataHora <= dataFim)
                .GroupBy(l => l.TipoAcao)
                .Select(g => new { Tipo = g.Key.ToString(), Count = g.Count() })
                .ToDictionaryAsync(x => x.Tipo, x => x.Count);
        }

        public async Task<Dictionary<string, int>> ObterEstatisticasPorUsuarioAsync(DateTime dataInicio, DateTime dataFim)
        {
            return await _context.LogsAuditoria
                .Include(l => l.Usuario)
                .Where(l => l.DataHora >= dataInicio && l.DataHora <= dataFim && l.Usuario != null)
                .GroupBy(l => l.Usuario!.NomeCompleto)
                .Select(g => new { Nome = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(10)
                .ToDictionaryAsync(x => x.Nome, x => x.Count);
        }

        public async Task<Dictionary<string, int>> ObterEstatisticasPorIPAsync(DateTime dataInicio, DateTime dataFim)
        {
            return await _context.LogsAuditoria
                .Where(l => l.DataHora >= dataInicio && l.DataHora <= dataFim)
                .GroupBy(l => l.EnderecoIP)
                .Select(g => new { IP = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(10)
                .ToDictionaryAsync(x => x.IP, x => x.Count);
        }

        public async Task<List<string>> ObterIPsSuspeitosAsync()
        {
            // IPs com mais de 10 tentativas de login falhado nas últimas 24h
            var ultimasDias = DateTime.UtcNow.AddDays(-1);

            return await _context.LogsAuditoria
                .Where(l => l.DataHora >= ultimasDias && l.TipoAcao == TipoAcaoAuditoria.LoginFalhado)
                .GroupBy(l => l.EnderecoIP)
                .Where(g => g.Count() > 10)
                .Select(g => g.Key)
                .ToListAsync();
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
                .Where(l => l.DataHora >= dataInicio && l.DataHora <= dataFim)
                .GroupBy(l => l.DataHora.Date)
                .Select(g => new { Data = g.Key, Count = g.Count() })
                .OrderBy(x => x.Data)
                .ToDictionaryAsync(x => x.Data, x => x.Count);
        }

        public async Task MarcarComoSuspeitoAsync(int logId, string motivo)
        {
            var log = await _context.LogsAuditoria.FindAsync(logId);
            if (log != null)
            {
                log.Suspeita = true;
                log.MotivoSuspeita = motivo;
                await _context.SaveChangesAsync();
            }
        }

        public async Task MarcarComoNaoSuspeitoAsync(int logId)
        {
            var log = await _context.LogsAuditoria.FindAsync(logId);
            if (log != null)
            {
                log.Suspeita = false;
                log.MotivoSuspeita = null;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<bool> VerificarAtividadeSuspeitaAsync(int usuarioId, string enderecoIP)
        {
            var ultimaHora = DateTime.UtcNow.AddHours(-1);

            // Verifica se há mais de 50 ações do mesmo usuário na última hora
            var acoesUsuario = await _context.LogsAuditoria
                .CountAsync(l => l.UsuarioId == usuarioId && l.DataHora >= ultimaHora);

            // Verifica se há mais de 100 ações do mesmo IP na última hora
            var acoesIP = await _context.LogsAuditoria
                .CountAsync(l => l.EnderecoIP == enderecoIP && l.DataHora >= ultimaHora);

            return acoesUsuario > 50 || acoesIP > 100;
        }
    }
}
