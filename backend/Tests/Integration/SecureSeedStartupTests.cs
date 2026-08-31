using System.Net;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class SecureSeedStartupTests(PostgreSqlContainerFixture database)
{
    private const string SyntheticEmail = "initial-admin@example.test";
    private const string SyntheticPassword = "synthetic-admin-passphrase-2026";

    [Fact]
    public async Task Empty_production_database_without_seed_configuration_aborts_before_health_check()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var factory = CreateFactory("Production");

        var exception = await Assert.ThrowsAnyAsync<Exception>(() => RequestHealthAsync(factory));

        Assert.Contains("Seed:AdminEmail", AllMessages(exception));
        Assert.DoesNotContain(SyntheticPassword, AllMessages(exception));
    }

    [Theory]
    [InlineData("not-an-email", "synthetic-admin-passphrase-2026", "Seed:AdminEmail")]
    [InlineData("initial-admin@example.test", null, "Seed:AdminPassword")]
    [InlineData("initial-admin@example.test", "short-password", "password_too_short")]
    [InlineData("initial-admin@example.test", "correct horse battery staple", "password_common")]
    public async Task Empty_production_database_with_invalid_seed_configuration_aborts(
        string email,
        string? password,
        string expectedReason)
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var factory = CreateFactory("Production", email, password);

        var exception = await Assert.ThrowsAnyAsync<Exception>(() => RequestHealthAsync(factory));
        var messages = AllMessages(exception);

        Assert.Contains(expectedReason, messages);
        if (password is not null)
        {
            Assert.DoesNotContain(password, messages);
        }
    }

    [Theory]
    [InlineData("Production")]
    [InlineData("Development")]
    public async Task Valid_configuration_creates_exactly_one_initial_admin(string environmentName)
    {
        await database.RecreateEmptyDatabaseAsync();
        await using var factory = CreateFactory(environmentName, SyntheticEmail, SyntheticPassword);

        Assert.Equal(HttpStatusCode.OK, await GetHealthStatusAsync(factory));

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var admin = Assert.Single(await context.Usuarios.AsNoTracking().ToListAsync());
        Assert.Equal("Administrador inicial", admin.NomeCompleto);
        Assert.Equal(SyntheticEmail, admin.Email);
        Assert.Equal(StatusUsuario.Habilitado, admin.Status);
        Assert.Equal(NivelUsuario.Administrador, admin.NivelUsuario);
        Assert.Equal(TipoUsuario.Administrador, admin.TipoUsuario);
        Assert.True(admin.ExigeTrocaSenha);
        Assert.Equal(0, admin.VersaoSessao);
        Assert.NotEqual(SyntheticPassword, admin.SenhaHash);
        Assert.Equal(
            PasswordVerificationResult.Success,
            new PasswordHasher<Usuario>().VerifyHashedPassword(admin, admin.SenhaHash, SyntheticPassword));
    }

    [Fact]
    public async Task Populated_database_does_not_require_seed_configuration_or_change_credentials()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using (var firstFactory = CreateFactory("Production", SyntheticEmail, SyntheticPassword))
        {
            Assert.Equal(HttpStatusCode.OK, await GetHealthStatusAsync(firstFactory));
        }

        string originalHash;
        await using (var context = CreateDbContext())
        {
            originalHash = await context.Usuarios.Select(user => user.SenhaHash).SingleAsync();
        }

        await using var restartFactory = CreateFactory("Production");
        Assert.Equal(HttpStatusCode.OK, await GetHealthStatusAsync(restartFactory));

        await using var scope = restartFactory.Services.CreateAsyncScope();
        var restartedContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = Assert.Single(await restartedContext.Usuarios.AsNoTracking().ToListAsync());
        Assert.Equal(originalHash, user.SenhaHash);
    }

    [Fact]
    public async Task Unrelated_data_does_not_make_an_empty_user_database_skip_seed_validation()
    {
        await database.RecreateEmptyDatabaseAsync();
        await using (var context = CreateDbContext())
        {
            await context.Database.MigrateAsync();
            context.Lotes.Add(new Lote { CodigoLote = "synthetic-existing-lot" });
            await context.SaveChangesAsync();
        }

        await using var factory = CreateFactory("Production");
        var exception = await Assert.ThrowsAnyAsync<Exception>(() => RequestHealthAsync(factory));

        Assert.Contains("Seed:AdminEmail", AllMessages(exception));
    }

    private IntegrationWebApplicationFactory CreateFactory(
        string environmentName,
        string? email = null,
        string? password = null)
    {
        var configuration = new Dictionary<string, string?>();
        if (email is not null)
        {
            configuration["Seed:AdminEmail"] = email;
        }

        if (password is not null)
        {
            configuration["Seed:AdminPassword"] = password;
        }

        return new IntegrationWebApplicationFactory(database, new()
        {
            EnvironmentName = environmentName,
            Configuration = configuration
        });
    }

    private AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(database.ConnectionString)
            .Options;
        return new AppDbContext(options);
    }

    private static async Task<HttpStatusCode> GetHealthStatusAsync(IntegrationWebApplicationFactory factory)
    {
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/health");
        return response.StatusCode;
    }

    private static async Task RequestHealthAsync(IntegrationWebApplicationFactory factory) =>
        _ = await GetHealthStatusAsync(factory);

    private static string AllMessages(Exception exception)
    {
        var messages = new List<string>();
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            messages.Add(current.Message);
        }

        return string.Join(Environment.NewLine, messages);
    }
}
