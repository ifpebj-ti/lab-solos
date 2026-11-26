using System.Data.Common;
using System.IdentityModel.Tokens.Jwt;
using System.Linq.Expressions;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.DTOs.Auth;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Tests.Controllers;

public class AuthControllerCoverageTests
{
    private const string SessionCookie = SessaoAutenticacaoDefaults.CookieName;

    public static TheoryData<string> MissingConstructorDependencies => new()
    {
        "jwtService",
        "uow",
        "passwordChangeRateLimitService",
        "passwordHasher",
        "protectionOptions",
        "secretFileReader",
        "hostEnvironment",
        "telemetry"
    };

    public static TheoryData<Exception> SessionStoreProtectionFailures => new()
    {
        new InvalidOperationException("synthetic session store failure"),
        new TimeoutException("synthetic session store timeout"),
        new CryptographicException("synthetic session protection failure"),
        new UnauthorizedAccessException("synthetic session store access failure"),
        new SyntheticDatabaseException("synthetic session database failure")
    };

    [Theory]
    [MemberData(nameof(MissingConstructorDependencies))]
    public void ConstructorRejectsMissingRequiredDependency(string parameterName)
    {
        var exception = Assert.Throws<ArgumentNullException>(
            () => CreateControllerWithNullDependency(parameterName));

        Assert.Equal(parameterName, exception.ParamName);
    }

    [Fact]
    public async Task LoginRejectsMissingBodyBeforeAccessingDependencies()
    {
        var harness = CreateHarness(environmentName: "Production");

        var result = await harness.Controller.Login(null, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("no-store", harness.Context.Response.Headers.CacheControl);
    }

    [Fact]
    public async Task LoginReturnsUnavailableWhenProductionSecretIsNotConfigured()
    {
        var harness = CreateHarness(environmentName: "Production");

        var result = await harness.Controller.Login(
            new LoginDTO { Email = "user@example.org", Password = "password" },
            CancellationToken.None);

        var unavailable = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, unavailable.StatusCode);
        var details = Assert.IsType<ProblemDetails>(unavailable.Value);
        Assert.Equal("authentication_protection_unavailable", details.Extensions["code"]);
    }

    [Theory]
    [InlineData("true", true)]
    [InlineData("false", false)]
    public void SessionReturnsSnapshotWithExpectedPasswordChangeFlag(
        string passwordChangeRequired,
        bool expectedPasswordChangeRequired)
    {
        var harness = CreateHarness(
        [
            new Claim(ClaimTypes.NameIdentifier, "42"),
            new Claim(ClaimTypes.Role, "Administrador"),
            new Claim(JwtClaimNames.PasswordChangeRequired, passwordChangeRequired)
        ]);
        SetSessionCookie(harness, "opaque-session-id");

        var result = harness.Controller.Session(CancellationToken.None);

        var success = Assert.IsType<OkObjectResult>(result);
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(success.Value));
        Assert.Equal(42, document.RootElement.GetProperty("userId").GetInt32());
        Assert.Equal("Administrador", document.RootElement.GetProperty("role").GetString());
        Assert.Equal(
            expectedPasswordChangeRequired,
            document.RootElement.GetProperty("requiresPasswordChange").GetBoolean());
        Assert.Equal(
            SessaoCsrfProof.Create("opaque-session-id"),
            document.RootElement.GetProperty("csrfToken").GetString());
        Assert.Equal("no-store", harness.Context.Response.Headers.CacheControl);
    }

    [Theory]
    [InlineData("not-an-integer", "opaque-session-id")]
    [InlineData("42", "")]
    public void SessionRejectsMalformedIdentityOrMissingCookie(string subject, string cookie)
    {
        var harness = CreateHarness([new Claim(ClaimTypes.NameIdentifier, subject)]);
        if (!string.IsNullOrEmpty(cookie))
        {
            SetSessionCookie(harness, cookie);
        }

        var result = harness.Controller.Session(CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
        Assert.Equal("no-store", harness.Context.Response.Headers.CacheControl);
    }

    [Fact]
    public async Task LogoutRevokesSessionByClaimsAndRemovesCookie()
    {
        var sessionId = Guid.NewGuid();
        var harness = CreateHarness(
        [
            new Claim(SessaoAutenticacaoDefaults.SessionIdClaim, sessionId.ToString("N")),
            new Claim(JwtRegisteredClaimNames.Jti, "jwt-id")
        ]);
        SetSessionCookie(harness, "opaque-session-id");
        harness.Sessions
            .Setup(service => service.RevogarAsync(
                sessionId,
                "opaque-session-id",
                "jwt-id",
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var result = await harness.Controller.Logout(CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        harness.Sessions.VerifyAll();
        var setCookie = harness.Context.Response.Headers.SetCookie.ToString();
        Assert.Contains($"{SessionCookie}=", setCookie);
        Assert.Contains("expires=Thu, 01 Jan 1970", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("no-store", harness.Context.Response.Headers.CacheControl);
    }

    [Fact]
    public async Task LogoutWithoutSessionIdentifiersRemainsIdempotent()
    {
        var harness = CreateHarness();
        harness.Sessions
            .Setup(service => service.RevogarAsync(
                null,
                null,
                null,
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var result = await harness.Controller.Logout(CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        harness.Sessions.VerifyAll();
    }

    [Fact]
    public async Task LogoutReturnsUnavailableWhenSessionServiceIsMissing()
    {
        var harness = CreateHarness(includeSessionService: false);

        var result = await harness.Controller.Logout(CancellationToken.None);

        var unavailable = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, unavailable.StatusCode);
        var details = Assert.IsType<ProblemDetails>(unavailable.Value);
        Assert.Equal("authentication_protection_unavailable", details.Extensions["code"]);
        Assert.Equal("no-store", harness.Context.Response.Headers.CacheControl);
        harness.Sessions.VerifyNoOtherCalls();
    }

    [Theory]
    [MemberData(nameof(SessionStoreProtectionFailures))]
    public async Task LogoutReturnsUnavailableWhenSessionStoreFails(Exception exception)
    {
        var harness = CreateHarness();
        harness.Sessions
            .Setup(service => service.RevogarAsync(
                It.IsAny<Guid?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(exception);

        var result = await harness.Controller.Logout(CancellationToken.None);

        var unavailable = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, unavailable.StatusCode);
        var details = Assert.IsType<ProblemDetails>(unavailable.Value);
        Assert.Equal("authentication_protection_unavailable", details.Extensions["code"]);
        Assert.Equal("no-store", harness.Context.Response.Headers.CacheControl);
    }

    [Theory]
    [InlineData("malformed-session-id", "42")]
    [InlineData("6f962548f0b64aa198288634a52d55ad", "not-an-integer")]
    public async Task RenewRejectsMalformedSessionOrIdentityClaims(string sessionId, string subject)
    {
        var harness = CreateHarness(
        [
            new Claim(SessaoAutenticacaoDefaults.SessionIdClaim, sessionId),
            new Claim(ClaimTypes.NameIdentifier, subject)
        ]);

        var result = await harness.Controller.Renew(CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
        Assert.Equal("no-store", harness.Context.Response.Headers.CacheControl);
    }

    [Fact]
    public async Task RenewRejectsMissingAccount()
    {
        var harness = CreateHarness(ValidRenewalClaims());
        harness.Users
            .Setup(repository => repository.ObterAsync(
                It.IsAny<Expression<Func<Usuario, bool>>>(),
                It.IsAny<Func<IQueryable<Usuario>, IQueryable<Usuario>>?>()))
            .ReturnsAsync(() => null);

        var result = await harness.Controller.Renew(CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
        harness.Sessions.Verify(
            service => service.RenovarAsync(
                It.IsAny<Guid>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task RenewRejectsSessionThatCannotBeRotated()
    {
        var harness = CreateHarness(ValidRenewalClaims());
        ConfigureUser(harness, CreateUser());
        harness.Sessions
            .Setup(service => service.RenovarAsync(
                It.IsAny<Guid>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => null);

        var result = await harness.Controller.Renew(CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task RenewRotatesSessionCookieAfterSuccessfulRenewal()
    {
        var harness = CreateHarness(ValidRenewalClaims());
        ConfigureUser(harness, CreateUser());
        var renewed = new SessaoCriada(
            "rotated-session-id",
            DateTimeOffset.UtcNow.AddHours(2),
            DateTimeOffset.UtcNow.AddMinutes(45),
            Guid.NewGuid());
        harness.Sessions
            .Setup(service => service.RenovarAsync(
                It.IsAny<Guid>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(renewed);

        var result = await harness.Controller.Renew(CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        Assert.Contains(
            $"{SessionCookie}=rotated-session-id",
            harness.Context.Response.Headers.SetCookie.ToString());
        harness.Sessions.VerifyAll();
    }

    [Fact]
    public async Task RenewReturnsUnavailableWhenSessionStoreFails()
    {
        var harness = CreateHarness(ValidRenewalClaims());
        ConfigureUser(harness, CreateUser());
        harness.Sessions
            .Setup(service => service.RenovarAsync(
                It.IsAny<Guid>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("synthetic session store failure"));

        var result = await harness.Controller.Renew(CancellationToken.None);

        var unavailable = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, unavailable.StatusCode);
    }

    private static ControllerHarness CreateHarness(
        IEnumerable<Claim>? claims = null,
        string environmentName = "IntegrationTesting",
        bool includeSessionService = true)
    {
        var users = new Mock<IRepository<Usuario>>(MockBehavior.Strict);
        var unitOfWork = new Mock<IUnitOfWork>(MockBehavior.Strict);
        unitOfWork.SetupGet(work => work.UsuarioRepository).Returns(users.Object);

        var sessions = new Mock<ISessaoService>(MockBehavior.Strict);
        var environment = new Mock<IHostEnvironment>();
        environment.SetupGet(host => host.EnvironmentName).Returns(environmentName);

        var context = new DefaultHttpContext();
        context.Request.Scheme = "https";
        context.Request.Host = new HostString("lab.test");
        context.User = new ClaimsPrincipal(new ClaimsIdentity(claims ?? [], "unit-test"));

        var controller = new AuthController(
            CreateJwtService(),
            unitOfWork.Object,
            Mock.Of<IPasswordChangeRateLimitService>(),
            new PasswordHasher<Usuario>(),
            Options.Create(new AuthenticationProtectionOptions()),
            Mock.Of<ISecretFileReader>(),
            environment.Object,
            new AuthenticationProtectionTelemetry(NullLogger<AuthenticationProtectionTelemetry>.Instance),
            includeSessionService ? sessions.Object : null)
        {
            ControllerContext = new ControllerContext { HttpContext = context }
        };

        return new ControllerHarness(controller, context, sessions, users);
    }

    private static AuthController CreateControllerWithNullDependency(string parameterName)
    {
        var jwtService = CreateJwtService();
        var unitOfWork = Mock.Of<IUnitOfWork>();
        var passwordChanges = Mock.Of<IPasswordChangeRateLimitService>();
        var passwordHasher = new PasswordHasher<Usuario>();
        var protectionOptions = Options.Create(new AuthenticationProtectionOptions());
        var secretReader = Mock.Of<ISecretFileReader>();
        var hostEnvironment = Mock.Of<IHostEnvironment>();
        var telemetry = new AuthenticationProtectionTelemetry(NullLogger<AuthenticationProtectionTelemetry>.Instance);

        return parameterName switch
        {
            "jwtService" => new AuthController(
                null!, unitOfWork, passwordChanges, passwordHasher, protectionOptions, secretReader, hostEnvironment, telemetry),
            "uow" => new AuthController(
                jwtService, null!, passwordChanges, passwordHasher, protectionOptions, secretReader, hostEnvironment, telemetry),
            "passwordChangeRateLimitService" => new AuthController(
                jwtService, unitOfWork, null!, passwordHasher, protectionOptions, secretReader, hostEnvironment, telemetry),
            "passwordHasher" => new AuthController(
                jwtService, unitOfWork, passwordChanges, null!, protectionOptions, secretReader, hostEnvironment, telemetry),
            "protectionOptions" => new AuthController(
                jwtService, unitOfWork, passwordChanges, passwordHasher, null!, secretReader, hostEnvironment, telemetry),
            "secretFileReader" => new AuthController(
                jwtService, unitOfWork, passwordChanges, passwordHasher, protectionOptions, null!, hostEnvironment, telemetry),
            "hostEnvironment" => new AuthController(
                jwtService, unitOfWork, passwordChanges, passwordHasher, protectionOptions, secretReader, null!, telemetry),
            "telemetry" => new AuthController(
                jwtService, unitOfWork, passwordChanges, passwordHasher, protectionOptions, secretReader, hostEnvironment, null!),
            _ => throw new ArgumentOutOfRangeException(nameof(parameterName), parameterName, "Unknown constructor dependency.")
        };
    }

    private static void SetSessionCookie(ControllerHarness harness, string identifier) =>
        harness.Context.Request.Headers.Cookie = $"{SessionCookie}={identifier}";

    private static IEnumerable<Claim> ValidRenewalClaims() =>
    [
        new Claim(SessaoAutenticacaoDefaults.SessionIdClaim, "6f962548f0b64aa198288634a52d55ad"),
        new Claim(ClaimTypes.NameIdentifier, "42")
    ];

    private static void ConfigureUser(ControllerHarness harness, Usuario user) =>
        harness.Users
            .Setup(repository => repository.ObterAsync(
                It.IsAny<Expression<Func<Usuario, bool>>>(),
                It.IsAny<Func<IQueryable<Usuario>, IQueryable<Usuario>>?>()))
            .ReturnsAsync(user);

    private static Usuario CreateUser() => new()
    {
        Id = 42,
        NomeCompleto = "Coverage test user",
        Email = "user@example.org",
        SenhaHash = "unused-hash",
        NivelUsuario = NivelUsuario.Administrador,
        TipoUsuario = TipoUsuario.Administrador,
        Status = StatusUsuario.Habilitado,
        VersaoSessao = 7
    };

    private static JwtService CreateJwtService()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "synthetic-controller-test-key-with-thirty-two-bytes",
                ["Jwt:Issuer"] = "controller-tests",
                ["Jwt:Audience"] = "controller-tests",
                ["Jwt:ExpiresInMinutes"] = "5"
            })
            .Build();
        return new JwtService(configuration);
    }

    private sealed record ControllerHarness(
        AuthController Controller,
        DefaultHttpContext Context,
        Mock<ISessaoService> Sessions,
        Mock<IRepository<Usuario>> Users);

    private sealed class SyntheticDatabaseException(string message) : DbException(message);
}
