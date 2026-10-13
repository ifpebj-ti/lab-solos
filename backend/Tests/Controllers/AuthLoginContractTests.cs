using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using Tests.Infrastructure;

namespace Tests.Controllers;

[Collection(PostgreSql15IntegrationGroup.Name)]
public sealed class AuthLoginContractTests(PostgreSql15ContainerFixture database)
{
    private const string Email = "login-contract@example.invalid";
    private const string ValidPassword = "valid current password 2026";
    private static readonly DateTimeOffset InitialTime =
        new(2026, 10, 13, 12, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(StatusUsuario.Pendente)]
    [InlineData(StatusUsuario.Bloqueado)]
    [InlineData(StatusUsuario.Desabilitado)]
    public async Task LoginUnavailableAccountUsesSameGenericUnauthorizedResponse(StatusUsuario status)
    {
        var factory = await CreateScenarioAsync(status, requiresPasswordChange: false);
        await using (factory)
        using (var client = factory.CreateClient())
        {
            using var response = await LoginAsync(client, Email, ValidPassword);
            var body = await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            Assert.Equal("Credenciais inválidas.", body);
            Assert.True(response.Headers.CacheControl?.NoStore);
        }
    }

    [Fact]
    public async Task LoginValidAccountReturnsPasswordChangeFlagAndVersionedClaims()
    {
        var factory = await CreateScenarioAsync(StatusUsuario.Habilitado, requiresPasswordChange: true);
        await using (factory)
        using (var client = factory.CreateClient())
        using (var response = await LoginAsync(client, Email, ValidPassword))
        {
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.True(response.Headers.CacheControl?.NoStore);

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.True(document.RootElement.GetProperty("requiresPasswordChange").GetBoolean());
            var token = document.RootElement.GetProperty("token").GetString();
            var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
            Assert.Equal("17", jwt.Claims.Single(claim => claim.Type == "session_version").Value);
            Assert.Equal("true", jwt.Claims.Single(claim => claim.Type == "password_change_required").Value);
        }
    }

    private async Task<IntegrationWebApplicationFactory> CreateScenarioAsync(
        StatusUsuario status,
        bool requiresPasswordChange)
    {
        var clock = new ControlledTimeProvider(InitialTime);
        var options = new AuthenticationProtectionOptions
        {
            KeyHashSecretFile = "/synthetic/authentication-key-hash.secret"
        };
        var factory = new IntegrationWebApplicationFactory(
            database,
            new IntegrationApplicationOptions
            {
                TimeProvider = clock,
                ConfigureServices = services =>
                {
                    services.RemoveAll<IOptions<AuthenticationProtectionOptions>>();
                    services.AddSingleton<IOptions<AuthenticationProtectionOptions>>(
                        Options.Create(options));
                    services.RemoveAll<ISecretFileReader>();
                    services.AddSingleton<ISecretFileReader>(new SyntheticSecretFileReader());
                    services.RemoveAll<IAuthenticationThrottleClock>();
                    services.AddSingleton<IAuthenticationThrottleClock>(
                        new TimeProviderAuthenticationThrottleClock(clock));
                }
            });
        await factory.RecreateDatabaseAsync();

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new Usuario
        {
            NomeCompleto = "Usuário de teste",
            Email = Email,
            SenhaHash = string.Empty,
            NivelUsuario = NivelUsuario.Comum,
            TipoUsuario = TipoUsuario.Comum,
            Status = status,
            ExigeTrocaSenha = requiresPasswordChange,
            VersaoSessao = 17
        };
        user.DefinirSenha(ValidPassword);
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        return factory;
    }

    private static Task<HttpResponseMessage> LoginAsync(HttpClient client, string email, string password) =>
        client.PostAsJsonAsync("/api/Auth/login", new { email, password });

    private sealed class SyntheticSecretFileReader : ISecretFileReader
    {
        private static readonly byte[] Secret = Enumerable.Range(0, 32).Select(value => (byte)value).ToArray();

        public byte[] ReadAllBytes(string path) => Secret.ToArray();
    }
}
