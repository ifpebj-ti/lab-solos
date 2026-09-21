using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Tests.Repositories;

public class LogAuditoriaRepositoryTests
{
    [Fact]
    public async Task ObterLogsFiltradosAsyncComFiltrosNulosNaoRestringeOsCincoCamposOpcionais()
    {
        await using var contexto = CriarContexto();
        await AdicionarLogsAsync(contexto);
        var repositorio = new LogAuditoriaRepository(contexto);

        var filtro = new FiltroAuditoriaDTO
        {
            UsuarioId = null,
            TipoAcao = null,
            DataInicio = null,
            DataFim = null,
            NivelRisco = null
        };

        var resultado = (await repositorio.ObterLogsFiltradosAsync(filtro)).ToList();

        Assert.Collection(
            resultado,
            log => Assert.Equal(3, log.Id),
            log => Assert.Equal(2, log.Id),
            log => Assert.Equal(1, log.Id));
        Assert.Equal(3, await repositorio.ObterTotalLogsFiltradosAsync(filtro));
    }

    [Fact]
    public async Task ObterLogsFiltradosAsyncComFiltrosPreenchidosAplicaUsuarioTipoDatasENivelDeRisco()
    {
        await using var contexto = CriarContexto();
        await AdicionarLogsAsync(contexto);
        var repositorio = new LogAuditoriaRepository(contexto);

        var filtro = new FiltroAuditoriaDTO
        {
            UsuarioId = 7,
            TipoAcao = TipoAcaoAuditoria.Login,
            DataInicio = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc),
            DataFim = new DateTime(2026, 1, 1, 18, 0, 0, DateTimeKind.Utc),
            NivelRisco = NivelRiscoAuditoria.Alto
        };

        var resultado = (await repositorio.ObterLogsFiltradosAsync(filtro)).ToList();

        var log = Assert.Single(resultado);
        Assert.Equal(1, log.Id);
        Assert.Equal(1, await repositorio.ObterTotalLogsFiltradosAsync(filtro));
    }

    private static AppDbContext CriarContexto()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"LogAuditoriaRepositoryTests-{Guid.NewGuid()}")
            .Options;

        return new AppDbContext(options);
    }

    private static async Task AdicionarLogsAsync(AppDbContext contexto)
    {
        contexto.LogsAuditoria.AddRange(
            CriarLog(1, new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc), 7, TipoAcaoAuditoria.Login, NivelRiscoAuditoria.Alto),
            CriarLog(2, new DateTime(2026, 1, 1, 13, 0, 0, DateTimeKind.Utc), null, TipoAcaoAuditoria.Logout, NivelRiscoAuditoria.Baixo),
            CriarLog(3, new DateTime(2026, 1, 2, 12, 0, 0, DateTimeKind.Utc), 7, TipoAcaoAuditoria.Login, NivelRiscoAuditoria.Alto));

        await contexto.SaveChangesAsync();
    }

    private static LogAuditoria CriarLog(
        int id,
        DateTime dataHora,
        int? usuarioId,
        TipoAcaoAuditoria tipoAcao,
        NivelRiscoAuditoria nivelRisco)
    {
        return new LogAuditoria
        {
            Id = id,
            DataHora = dataHora,
            UsuarioId = usuarioId,
            TipoAcao = tipoAcao,
            NivelRisco = nivelRisco,
            Acao = tipoAcao.ToString(),
            Recurso = $"Recurso-{id}",
            EnderecoIP = $"192.168.0.{id}"
        };
    }
}
