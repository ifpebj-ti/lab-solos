using System.Data.Common;
using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace LabSolos_Server_DotNet8.Services.Security;

public interface ISessaoService
{
    Task<SessaoCriada> CriarAsync(int usuarioId, long versaoSessao, string jwtId, CancellationToken cancellationToken);

    Task<SessaoValidada?> ValidarCookieAsync(string identificador, CancellationToken cancellationToken);

    Task<ResultadoValidacaoJwt> ValidarJwtAsync(
        string jwtId,
        int usuarioId,
        long versaoSessao,
        string papel,
        bool exigeTrocaSenha,
        CancellationToken cancellationToken);

    Task<SessaoCriada?> RenovarAsync(Guid sessaoId, string novoJwtId, CancellationToken cancellationToken);

    Task RevogarAsync(
        Guid? sessaoId,
        string? identificador,
        string? jwtId,
        CancellationToken cancellationToken);
}

public sealed class SessaoService(AppDbContext dbContext, TimeProvider timeProvider) : ISessaoService
{
    public static readonly TimeSpan InatividadeMaxima = TimeSpan.FromMinutes(60);
    public static readonly TimeSpan DuracaoAbsolutaMaxima = TimeSpan.FromHours(8);

    public async Task<SessaoCriada> CriarAsync(
        int usuarioId,
        long versaoSessao,
        string jwtId,
        CancellationToken cancellationToken)
    {
        var now = timeProvider.GetUtcNow();
        await dbContext.SessoesAutenticacao
            .Where(session => session.ExpiraEmUtc <= now)
            .ExecuteDeleteAsync(cancellationToken);

        var identificador = GerarIdentificador();
        var session = new SessaoAutenticacao
        {
            Id = Guid.NewGuid(),
            IdentificadorHash = CalcularHash(identificador),
            JwtIdHash = CalcularHash(jwtId),
            UsuarioId = usuarioId,
            VersaoSessao = versaoSessao,
            CriadaEmUtc = now,
            UltimaAtividadeEmUtc = now,
            ExpiraEmUtc = now.Add(DuracaoAbsolutaMaxima),
            Revisao = 0
        };

        dbContext.SessoesAutenticacao.Add(session);
        await dbContext.SaveChangesAsync(cancellationToken);

        return CriarResposta(session, identificador, now);
    }

    public Task<SessaoValidada?> ValidarCookieAsync(
        string identificador,
        CancellationToken cancellationToken)
    {
        var hash = CalcularHash(identificador);
        return ValidarAsync(session => session.IdentificadorHash == hash, cancellationToken);
    }

    public async Task<ResultadoValidacaoJwt> ValidarJwtAsync(
        string jwtId,
        int usuarioId,
        long versaoSessao,
        string papel,
        bool exigeTrocaSenha,
        CancellationToken cancellationToken)
    {
        var session = await ConsultarSessaoAsync(
            session => session.JwtIdHash == CalcularHash(jwtId), cancellationToken);
        if (session is null)
        {
            return new ResultadoValidacaoJwt(SessaoJwtStatus.SemRegistro, null);
        }

        if (session.UsuarioId != usuarioId
            || session.VersaoSessao != versaoSessao
            || session.Usuario is null
            || session.Usuario.NivelUsuario.ToString() != papel
            || session.Usuario.ExigeTrocaSenha != exigeTrocaSenha)
        {
            return new ResultadoValidacaoJwt(SessaoJwtStatus.Invalida, null);
        }

        var validated = await TocarSeValidaAsync(session, cancellationToken);
        return validated is null
            ? new ResultadoValidacaoJwt(SessaoJwtStatus.Invalida, null)
            : new ResultadoValidacaoJwt(SessaoJwtStatus.Valida, validated);
    }

    public async Task<SessaoCriada?> RenovarAsync(
        Guid sessaoId,
        string novoJwtId,
        CancellationToken cancellationToken)
    {
        var now = timeProvider.GetUtcNow();
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            System.Data.IsolationLevel.ReadCommitted,
            cancellationToken);

        var current = await dbContext.SessoesAutenticacao
            .Include(session => session.Usuario)
            .SingleOrDefaultAsync(session => session.Id == sessaoId, cancellationToken);
        if (current is null || !PodeUsar(current, now))
        {
            return null;
        }

        var identificador = GerarIdentificador();
        var rotated = new SessaoAutenticacao
        {
            Id = Guid.NewGuid(),
            IdentificadorHash = CalcularHash(identificador),
            JwtIdHash = CalcularHash(novoJwtId),
            UsuarioId = current.UsuarioId,
            VersaoSessao = current.VersaoSessao,
            CriadaEmUtc = current.CriadaEmUtc,
            UltimaAtividadeEmUtc = now,
            ExpiraEmUtc = current.ExpiraEmUtc,
            Revisao = 0
        };

        current.RevogadaEmUtc = now;
        current.Revisao++;
        dbContext.SessoesAutenticacao.Add(rotated);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync(cancellationToken);
            dbContext.ChangeTracker.Clear();
            return null;
        }

        return CriarResposta(rotated, identificador, now);
    }

    public async Task RevogarAsync(
        Guid? sessaoId,
        string? identificador,
        string? jwtId,
        CancellationToken cancellationToken)
    {
        IQueryable<SessaoAutenticacao> query = dbContext.SessoesAutenticacao;
        if (sessaoId.HasValue)
        {
            query = query.Where(session => session.Id == sessaoId.Value);
        }
        else if (!string.IsNullOrWhiteSpace(identificador))
        {
            var hash = CalcularHash(identificador);
            query = query.Where(session => session.IdentificadorHash == hash);
        }
        else if (!string.IsNullOrWhiteSpace(jwtId))
        {
            var hash = CalcularHash(jwtId);
            query = query.Where(session => session.JwtIdHash == hash);
        }
        else
        {
            return;
        }

        var now = timeProvider.GetUtcNow();
        await query
            .Where(session => session.RevogadaEmUtc == null)
            .ExecuteUpdateAsync(update => update
                .SetProperty(session => session.RevogadaEmUtc, now)
                .SetProperty(session => session.Revisao, session => session.Revisao + 1), cancellationToken);
    }

    private async Task<SessaoValidada?> ValidarAsync(
        System.Linq.Expressions.Expression<Func<SessaoAutenticacao, bool>> predicate,
        CancellationToken cancellationToken)
    {
        var session = await ConsultarSessaoAsync(predicate, cancellationToken);
        return session is null ? null : await TocarSeValidaAsync(session, cancellationToken);
    }

    private async Task<SessaoAutenticacao?> ConsultarSessaoAsync(
        System.Linq.Expressions.Expression<Func<SessaoAutenticacao, bool>> predicate,
        CancellationToken cancellationToken) =>
        await dbContext.SessoesAutenticacao
            .AsNoTracking()
            .Include(session => session.Usuario)
            .SingleOrDefaultAsync(predicate, cancellationToken);

    private async Task<SessaoValidada?> TocarSeValidaAsync(
        SessaoAutenticacao session,
        CancellationToken cancellationToken)
    {
        var now = timeProvider.GetUtcNow();
        if (!PodeUsar(session, now))
        {
            return null;
        }

        var touched = await dbContext.SessoesAutenticacao
            .Where(candidate => candidate.Id == session.Id
                && candidate.RevogadaEmUtc == null
                && candidate.UltimaAtividadeEmUtc > now.Subtract(InatividadeMaxima)
                && candidate.ExpiraEmUtc > now
                && candidate.VersaoSessao == candidate.Usuario.VersaoSessao
                && candidate.Usuario.Status == StatusUsuario.Habilitado)
            .ExecuteUpdateAsync(update => update
                .SetProperty(candidate => candidate.UltimaAtividadeEmUtc, now), cancellationToken);
        if (touched != 1)
        {
            return null;
        }

        session.UltimaAtividadeEmUtc = now;
        return CriarValidada(session);
    }

    private static bool PodeUsar(SessaoAutenticacao session, DateTimeOffset now) =>
        session.RevogadaEmUtc is null
        && session.Usuario is not null
        && session.Usuario.Status == StatusUsuario.Habilitado
        && session.Usuario.VersaoSessao == session.VersaoSessao
        && now < session.UltimaAtividadeEmUtc.Add(InatividadeMaxima)
        && now < session.ExpiraEmUtc;

    private static SessaoCriada CriarResposta(SessaoAutenticacao session, string identificador, DateTimeOffset now) =>
        new(identificador, session.ExpiraEmUtc, now.Add(InatividadeMaxima), session.Id);

    private static SessaoValidada CriarValidada(SessaoAutenticacao session) => new(
        session.Id,
        session.UsuarioId,
        session.Usuario.Email,
        session.Usuario.NivelUsuario,
        session.VersaoSessao,
        session.Usuario.ExigeTrocaSenha,
        session.JwtIdHash,
        session.ExpiraEmUtc);

    private static string GerarIdentificador() =>
        WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));

    private static string CalcularHash(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}

public enum SessaoJwtStatus
{
    Valida,
    Invalida,
    SemRegistro
}

public sealed record ResultadoValidacaoJwt(SessaoJwtStatus Status, SessaoValidada? Sessao);

public sealed record SessaoCriada(
    string Identificador,
    DateTimeOffset ExpiraAbsolutaEmUtc,
    DateTimeOffset ExpiraInatividadeEmUtc,
    Guid SessaoId);

public sealed record SessaoValidada(
    Guid Id,
    int UsuarioId,
    string Email,
    NivelUsuario NivelUsuario,
    long VersaoSessao,
    bool ExigeTrocaSenha,
    string? JwtIdHash,
    DateTimeOffset ExpiraEmUtc);

public static class SessaoAutenticacaoDefaults
{
    public const string CookieName = "lab_solos_session";
    public const string CookieScheme = "OpaqueSession";
    public const string CompositeScheme = "SessionOrBearer";
    public const string SessionIdClaim = "lab_solos_session_id";
    public const string StoreUnavailableItem = "lab_solos_session_store_unavailable";
}

public static class SessaoCookie
{
    public static void Gravar(
        HttpResponse response,
        HttpRequest request,
        IHostEnvironment hostEnvironment,
        string identificador,
        DateTimeOffset expiraEmUtc)
    {
        response.Cookies.Append(
            SessaoAutenticacaoDefaults.CookieName,
            identificador,
            Opcoes(request, hostEnvironment, expiraEmUtc));
    }

    public static void Remover(HttpResponse response, HttpRequest request, IHostEnvironment hostEnvironment) =>
        response.Cookies.Delete(
            SessaoAutenticacaoDefaults.CookieName,
            Opcoes(request, hostEnvironment, DateTimeOffset.UnixEpoch));

    public static DateTimeOffset LimiteCookie(SessaoCriada session) =>
        session.ExpiraInatividadeEmUtc < session.ExpiraAbsolutaEmUtc
            ? session.ExpiraInatividadeEmUtc
            : session.ExpiraAbsolutaEmUtc;

    public static DateTimeOffset LimiteCookie(SessaoValidada session, DateTimeOffset now)
    {
        var idleExpiry = now.Add(SessaoService.InatividadeMaxima);
        return idleExpiry < session.ExpiraEmUtc ? idleExpiry : session.ExpiraEmUtc;
    }

    private static CookieOptions Opcoes(
        HttpRequest request,
        IHostEnvironment hostEnvironment,
        DateTimeOffset expiraEmUtc) => new()
    {
        HttpOnly = true,
        Secure = request.IsHttps || hostEnvironment.IsProduction(),
        SameSite = SameSiteMode.Lax,
        Path = "/",
        Expires = expiraEmUtc,
        IsEssential = true
    };
}

public sealed class SessaoCookieAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    System.Text.Encodings.Web.UrlEncoder encoder,
    ISessaoService sessaoService,
    TimeProvider timeProvider,
    IHostEnvironment hostEnvironment)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Cookies.TryGetValue(SessaoAutenticacaoDefaults.CookieName, out var identificador)
            || string.IsNullOrWhiteSpace(identificador))
        {
            return AuthenticateResult.NoResult();
        }

        try
        {
            var session = await sessaoService.ValidarCookieAsync(identificador, Context.RequestAborted);
            if (session is null)
            {
                return AuthenticateResult.Fail("Sessão inválida.");
            }

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, session.UsuarioId.ToString(CultureInfo.InvariantCulture)),
                new(ClaimTypes.NameIdentifier, session.UsuarioId.ToString(CultureInfo.InvariantCulture)),
                new(JwtRegisteredClaimNames.Email, session.Email),
                new(ClaimTypes.Role, session.NivelUsuario.ToString()),
                new(JwtClaimNames.SessionVersion, session.VersaoSessao.ToString(CultureInfo.InvariantCulture)),
                new(JwtClaimNames.PasswordChangeRequired, session.ExigeTrocaSenha ? "true" : "false"),
                new(SessaoAutenticacaoDefaults.SessionIdClaim, session.Id.ToString("N"))
            };
            if (!string.IsNullOrWhiteSpace(session.JwtIdHash))
            {
                claims.Add(new Claim("lab_solos_session_jwt_hash", session.JwtIdHash));
            }

            var identity = new ClaimsIdentity(claims, Scheme.Name, ClaimTypes.Name, ClaimTypes.Role);
            var principal = new ClaimsPrincipal(identity);
            var now = timeProvider.GetUtcNow();
            var isRotationOrLogout = Request.Path.Equals("/api/Auth/renew", StringComparison.OrdinalIgnoreCase)
                || Request.Path.Equals("/api/Auth/logout", StringComparison.OrdinalIgnoreCase);
            if (!isRotationOrLogout)
            {
                SessaoCookie.Gravar(
                    Response,
                    Request,
                    hostEnvironment,
                    identificador,
                    SessaoCookie.LimiteCookie(session, now));
            }
            return AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name));
        }
        catch (Exception exception) when (SessaoFalhaArmazenamento.IsUnavailable(exception))
        {
            Context.Items[SessaoAutenticacaoDefaults.StoreUnavailableItem] = true;
            return AuthenticateResult.Fail(exception);
        }
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        if (Context.Items.ContainsKey(SessaoAutenticacaoDefaults.StoreUnavailableItem))
        {
            Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            Response.ContentType = "application/problem+json";
            return Response.WriteAsJsonAsync(new
            {
                type = "https://httpstatuses.com/503",
                title = "A sessão não pôde ser verificada.",
                status = StatusCodes.Status503ServiceUnavailable,
                code = "session_store_unavailable"
            });
        }

        return base.HandleChallengeAsync(properties);
    }
}

public static class SessaoFalhaArmazenamento
{
    public static bool IsUnavailable(Exception exception)
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current is DbException or DbUpdateException or TimeoutException or InvalidOperationException)
            {
                return true;
            }
        }

        return false;
    }
}
