using System.Security.Cryptography;
using System.Text;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSql15IntegrationGroup.Name)]
public sealed class CredentialServiceRecoveryDeliveryTests(PostgreSql15ContainerFixture database)
{
    private const int UserId = 782_001;
    private const string Email = "credential-delivery@example.invalid";
    private const string OtherEmail = "different-address@example.invalid";

    [Fact]
    public async Task IssuesPasswordResetForEligibleUserInsideCallerTransaction()
    {
        var now = new DateTimeOffset(2026, 11, 26, 12, 0, 0, TimeSpan.Zero);
        await using var factory = await CreateFactoryAsync(now);
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = CreateUser();
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();

        await using (var transaction = await context.Database.BeginTransactionAsync())
        {
            var issue = await scope.ServiceProvider.GetRequiredService<ICredentialService>()
                .IssuePasswordResetForDeliveryAsync(UserId, Email);

            Assert.NotNull(issue);
            Assert.Equal(UserId, issue.UserId);
            Assert.Equal(Email, issue.Email);
            Assert.Equal("Synthetic", issue.RecipientName);
            Assert.Equal(user.VersaoSessao, issue.SessionVersion);
            Assert.Equal(now.AddMinutes(15), issue.ExpiresAt);
            Assert.Equal(
                Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(issue.Token))),
                user.TokenRedefinicaoHash);
            Assert.Equal(issue.ExpiresAt.UtcDateTime, user.TokenExpiracao);

            await transaction.CommitAsync();
        }

        context.ChangeTracker.Clear();
        var persisted = await context.Usuarios.AsNoTracking().SingleAsync(candidate => candidate.Id == UserId);
        Assert.Equal(user.TokenRedefinicaoHash, persisted.TokenRedefinicaoHash);
        Assert.Equal(user.TokenExpiracao, persisted.TokenExpiracao);
    }

    [Theory]
    [InlineData(false, StatusUsuario.Habilitado, Email)]
    [InlineData(true, StatusUsuario.Desabilitado, Email)]
    [InlineData(true, StatusUsuario.Habilitado, OtherEmail)]
    public async Task DoesNotIssueForMissingDisabledOrEmailMismatch(
        bool userExists,
        StatusUsuario status,
        string storedEmail)
    {
        await using var factory = await CreateFactoryAsync(DateTimeOffset.UtcNow);
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (userExists)
        {
            var user = CreateUser();
            user.Status = status;
            user.Email = storedEmail;
            context.Usuarios.Add(user);
            await context.SaveChangesAsync();
        }

        PasswordResetDeliveryIssue? issue;
        await using (var transaction = await context.Database.BeginTransactionAsync())
        {
            issue = await scope.ServiceProvider.GetRequiredService<ICredentialService>()
                .IssuePasswordResetForDeliveryAsync(UserId, Email);
            await transaction.CommitAsync();
        }

        Assert.Null(issue);
        var persisted = await context.Usuarios.AsNoTracking()
            .SingleOrDefaultAsync(candidate => candidate.Id == UserId);
        if (userExists)
        {
            Assert.NotNull(persisted);
            Assert.Equal("existing-token-hash", persisted.TokenRedefinicaoHash);
            Assert.Equal(new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc), persisted.TokenExpiracao);
        }
        else
        {
            Assert.Null(persisted);
        }
    }

    [Fact]
    public async Task RollsBackIssuedCredentialWhenCallerRollsBackTransaction()
    {
        await using var factory = await CreateFactoryAsync(DateTimeOffset.UtcNow);
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Usuarios.Add(CreateUser());
        await context.SaveChangesAsync();

        await using (var transaction = await context.Database.BeginTransactionAsync())
        {
            var issue = await scope.ServiceProvider.GetRequiredService<ICredentialService>()
                .IssuePasswordResetForDeliveryAsync(UserId, Email);
            Assert.NotNull(issue);
            await transaction.RollbackAsync();
        }

        context.ChangeTracker.Clear();
        var persisted = await context.Usuarios.AsNoTracking().SingleAsync(candidate => candidate.Id == UserId);
        Assert.Equal("existing-token-hash", persisted.TokenRedefinicaoHash);
        Assert.Equal(new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc), persisted.TokenExpiracao);
    }

    [Fact]
    public async Task RequiresCallerTransactionBeforeIssuingRecoveryCode()
    {
        await using var factory = await CreateFactoryAsync(DateTimeOffset.UtcNow);
        await using var scope = factory.Services.CreateAsyncScope();

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            scope.ServiceProvider.GetRequiredService<ICredentialService>()
                .IssuePasswordResetForDeliveryAsync(UserId, Email));

        Assert.Equal("Recovery delivery issuance requires an external transaction.", exception.Message);
    }

    private async Task<IntegrationWebApplicationFactory> CreateFactoryAsync(DateTimeOffset now)
    {
        var factory = new IntegrationWebApplicationFactory(database, new()
        {
            TimeProvider = new ControlledTimeProvider(now)
        });
        await factory.RecreateDatabaseAsync();
        return factory;
    }

    private static Usuario CreateUser() => new()
    {
        Id = UserId,
        NomeCompleto = "Synthetic recovery recipient",
        Email = Email,
        SenhaHash = "synthetic-password-hash",
        NivelUsuario = NivelUsuario.Comum,
        TipoUsuario = TipoUsuario.Comum,
        Status = StatusUsuario.Habilitado,
        ExigeTrocaSenha = false,
        VersaoSessao = 7,
        TokenRedefinicaoHash = "existing-token-hash",
        TokenExpiracao = new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc)
    };
}
