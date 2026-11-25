using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class JwtSessionVersionTests(PostgreSqlContainerFixture database)
{
    private const string Utf8Key = "chave-sintética-de-integração-para-sessões-jwt";

    [Theory]
    [InlineData("synthetic-jwt-round-trip-key-with-at-least-thirty-two-bytes", false, HttpStatusCode.OK)]
    [InlineData(Utf8Key, false, HttpStatusCode.OK)]
    [InlineData(Utf8Key, true, HttpStatusCode.Forbidden)]
    public async Task IssuedSessionUsesConfiguredJwtAndRespectsPasswordChangeRestriction(
        string key,
        bool passwordChangeRequired,
        HttpStatusCode expectedStatus)
    {
        const string issuer = "synthetic-session-issuer";
        const string audience = "synthetic-session-audience";
        const int expiresInMinutes = 13;
        var user = CreateUser();
        user.ExigeTrocaSenha = passwordChangeRequired;
        await using var factory = await CreateFactoryWithUserAsync(user, new()
        {
            Configuration = new Dictionary<string, string?>
            {
                ["Jwt:Key"] = key,
                ["Jwt:Issuer"] = issuer,
                ["Jwt:Audience"] = audience,
                ["Jwt:ExpiresInMinutes"] = expiresInMinutes.ToString(CultureInfo.InvariantCulture)
            }
        });

        var token = factory.Services.GetRequiredService<JwtService>().GenerateToken(user);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        Assert.Equal(issuer, jwt.Issuer);
        Assert.Equal(audience, Assert.Single(jwt.Audiences));
        Assert.Equal(TimeSpan.FromMinutes(expiresInMinutes), jwt.ValidTo - jwt.IssuedAt);
        Assert.Equal(expectedStatus, await GetPrivateStatusAsync(factory, token));
    }

    [Fact]
    public async Task TokensIssuedBeforeVersionIncrement_AreRejectedAfterIncrement()
    {
        await using var factory = await CreateFactoryWithUserAsync();
        var first = CreateToken(userId: 42, sessionVersion: "3", passwordChangeRequired: "false");
        var second = CreateToken(userId: 42, sessionVersion: "3", passwordChangeRequired: "false");

        Assert.Equal(HttpStatusCode.OK, await GetPrivateStatusAsync(factory, first));
        Assert.Equal(HttpStatusCode.OK, await GetPrivateStatusAsync(factory, second));

        await UpdateUserAsync(factory, user => user.VersaoSessao++);

        Assert.Equal(HttpStatusCode.Unauthorized, await GetPrivateStatusAsync(factory, first));
        Assert.Equal(HttpStatusCode.Unauthorized, await GetPrivateStatusAsync(factory, second));
    }

    [Theory]
    [InlineData(null, "false", 42, StatusUsuario.Habilitado)]
    [InlineData("not-a-number", "false", 42, StatusUsuario.Habilitado)]
    [InlineData("3", null, 42, StatusUsuario.Habilitado)]
    [InlineData("3", "not-a-boolean", 42, StatusUsuario.Habilitado)]
    [InlineData("3", "false", 999, StatusUsuario.Habilitado)]
    [InlineData("3", "false", 42, StatusUsuario.Desabilitado)]
    [InlineData("2", "false", 42, StatusUsuario.Habilitado)]
    public async Task InvalidSessionIdentity_IsRejected(
        string? sessionVersion,
        string? passwordChangeRequired,
        int subject,
        StatusUsuario status)
    {
        await using var factory = await CreateFactoryWithUserAsync(CreateUser(status));
        var token = CreateToken(subject, sessionVersion, passwordChangeRequired);

        var response = await GetPrivateStatusAsync(factory, token);

        Assert.Equal(HttpStatusCode.Unauthorized, response);
    }

    private async Task<IntegrationWebApplicationFactory> CreateFactoryWithUserAsync(
        Usuario? user = null,
        IntegrationApplicationOptions? options = null)
    {
        var factory = new IntegrationWebApplicationFactory(database, options);
        await factory.RecreateDatabaseAsync();
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Usuarios.Add(user ?? CreateUser());
        await context.SaveChangesAsync();
        return factory;
    }

    private static async Task UpdateUserAsync(
        IntegrationWebApplicationFactory factory,
        Action<Usuario> update)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await context.Usuarios.SingleAsync(u => u.Id == 42);
        update(user);
        await context.SaveChangesAsync();
    }

    private static async Task<HttpStatusCode> GetPrivateStatusAsync(
        IntegrationWebApplicationFactory factory,
        string token)
    {
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return (await client.GetAsync("/api/Produtos")).StatusCode;
    }

    internal static string CreateToken(
        int userId,
        string? sessionVersion,
        string? passwordChangeRequired,
        NivelUsuario userLevel = NivelUsuario.Comum)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(ClaimTypes.Role, userLevel.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        if (sessionVersion is not null)
        {
            claims.Add(new Claim("session_version", sessionVersion));
        }
        if (passwordChangeRequired is not null)
        {
            claims.Add(new Claim("password_change_required", passwordChangeRequired));
        }

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(5),
            Issuer = "labsolos-integration-tests",
            Audience = "labsolos-integration-tests",
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                    "synthetic-integration-jwt-key-with-at-least-thirty-two-bytes")),
                SecurityAlgorithms.HmacSha256Signature)
        };
        var handler = new JwtSecurityTokenHandler();
        return handler.WriteToken(handler.CreateToken(descriptor));
    }

    internal static Usuario CreateUser(
        StatusUsuario status = StatusUsuario.Habilitado,
        NivelUsuario userLevel = NivelUsuario.Comum) => new()
    {
        Id = 42,
        NomeCompleto = "Usuário de integração",
        Email = "integration@example.test",
        SenhaHash = "unused-hash",
        NivelUsuario = userLevel,
        TipoUsuario = TipoUsuario.Comum,
        Status = status,
        ExigeTrocaSenha = false,
        VersaoSessao = 3
    };
}
