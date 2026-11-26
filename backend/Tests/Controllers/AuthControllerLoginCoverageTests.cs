using System.Net;
using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Auth;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Tests.Controllers;

public sealed class AuthControllerLoginCoverageTests
{
    [Fact]
    public async Task LoginFailsClosedWhenThrottleServiceIsUnavailableForInvalidIdentifier()
    {
        using var services = new ServiceCollection().BuildServiceProvider();
        var harness = CreateHarness(services);

        var result = await harness.Controller.Login(
            new LoginDTO { Email = " \t ", Password = "synthetic password" },
            CancellationToken.None);

        var unavailable = Assert.IsType<ObjectResult>(result);
        Assert.Equal((int)HttpStatusCode.ServiceUnavailable, unavailable.StatusCode);
        var details = Assert.IsType<ProblemDetails>(unavailable.Value);
        Assert.Equal("authentication_protection_unavailable", details.Extensions["code"]);
        Assert.Equal("no-store", harness.Context.Response.Headers.CacheControl);
        harness.Users.Verify(
            repository => repository.ObterAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<Usuario, bool>>>(),
                It.IsAny<Func<IQueryable<Usuario>, IQueryable<Usuario>>?>()),
            Times.Never);
        harness.Sessions.Verify(
            service => service.CriarAsync(
                It.IsAny<int>(),
                It.IsAny<long>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task LoginFailsClosedWhenProtectionOptionsValidationFails()
    {
        using var services = new ServiceCollection().BuildServiceProvider();
        var protectionOptions = new Mock<IOptions<AuthenticationProtectionOptions>>(MockBehavior.Strict);
        protectionOptions
            .SetupGet(options => options.Value)
            .Throws(new OptionsValidationException(
                "AuthenticationProtection",
                typeof(AuthenticationProtectionOptions),
                ["synthetic invalid setting"]));
        var harness = CreateHarness(
            services,
            validatedProtectionOptions: protectionOptions.Object);

        var result = await harness.Controller.Login(
            new LoginDTO { Email = "user@example.org", Password = "synthetic password" },
            CancellationToken.None);

        var unavailable = Assert.IsType<ObjectResult>(result);
        Assert.Equal((int)HttpStatusCode.ServiceUnavailable, unavailable.StatusCode);
        var details = Assert.IsType<ProblemDetails>(unavailable.Value);
        Assert.Equal("authentication_protection_unavailable", details.Extensions["code"]);
        Assert.Equal("no-store", harness.Context.Response.Headers.CacheControl);
        protectionOptions.VerifyAll();
        harness.Users.Verify(
            repository => repository.ObterAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<Usuario, bool>>>(),
                It.IsAny<Func<IQueryable<Usuario>, IQueryable<Usuario>>?>()),
            Times.Never);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task LoginFailsClosedWhenConfiguredThrottleSecretCannotBeRead(bool accessDenied)
    {
        using var services = new ServiceCollection().BuildServiceProvider();
        var secretReader = new Mock<ISecretFileReader>(MockBehavior.Strict);
        Exception readFailure = accessDenied
            ? new UnauthorizedAccessException("synthetic secret access failure")
            : new IOException("synthetic secret read failure");
        secretReader
            .Setup(reader => reader.ReadAllBytes("/synthetic/authentication-key-hash.secret"))
            .Throws(readFailure);
        var harness = CreateHarness(
            services,
            environmentName: "Production",
            protectionOptions: new AuthenticationProtectionOptions
            {
                KeyHashSecretFile = "/synthetic/authentication-key-hash.secret"
            },
            secretReader: secretReader.Object);

        var result = await harness.Controller.Login(
            new LoginDTO { Email = "user@example.org", Password = "synthetic password" },
            CancellationToken.None);

        var unavailable = Assert.IsType<ObjectResult>(result);
        Assert.Equal((int)HttpStatusCode.ServiceUnavailable, unavailable.StatusCode);
        var details = Assert.IsType<ProblemDetails>(unavailable.Value);
        Assert.Equal("authentication_protection_unavailable", details.Extensions["code"]);
        Assert.Equal("no-store", harness.Context.Response.Headers.CacheControl);
        secretReader.VerifyAll();
        harness.Users.Verify(
            repository => repository.ObterAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<Usuario, bool>>>(),
                It.IsAny<Func<IQueryable<Usuario>, IQueryable<Usuario>>?>()),
            Times.Never);
        harness.Sessions.Verify(
            service => service.CriarAsync(
                It.IsAny<int>(),
                It.IsAny<long>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    private static LoginHarness CreateHarness(
        IServiceProvider services,
        string environmentName = "IntegrationTesting",
        AuthenticationProtectionOptions? protectionOptions = null,
        ISecretFileReader? secretReader = null,
        IOptions<AuthenticationProtectionOptions>? validatedProtectionOptions = null)
    {
        var users = new Mock<IRepository<Usuario>>(MockBehavior.Strict);
        var unitOfWork = new Mock<IUnitOfWork>(MockBehavior.Strict);
        unitOfWork.SetupGet(work => work.UsuarioRepository).Returns(users.Object);
        var sessions = new Mock<ISessaoService>(MockBehavior.Strict);
        var environment = new Mock<IHostEnvironment>();
        environment.SetupGet(host => host.EnvironmentName).Returns(environmentName);
        var context = new DefaultHttpContext
        {
            RequestServices = services
        };
        context.Request.Scheme = "https";
        context.Request.Host = new HostString("lab.test");

        var controller = new AuthController(
            CreateJwtService(),
            unitOfWork.Object,
            Mock.Of<IPasswordChangeRateLimitService>(),
            new PasswordHasher<Usuario>(),
            validatedProtectionOptions ?? Options.Create(protectionOptions ?? new AuthenticationProtectionOptions()),
            secretReader ?? Mock.Of<ISecretFileReader>(),
            environment.Object,
            new AuthenticationProtectionTelemetry(NullLogger<AuthenticationProtectionTelemetry>.Instance),
            sessions.Object)
        {
            ControllerContext = new ControllerContext { HttpContext = context }
        };

        return new LoginHarness(controller, context, users, sessions);
    }

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

    private sealed record LoginHarness(
        AuthController Controller,
        DefaultHttpContext Context,
        Mock<IRepository<Usuario>> Users,
        Mock<ISessaoService> Sessions);
}
