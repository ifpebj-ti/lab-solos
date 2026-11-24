using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class AdminContinuityTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task LastEnabledAdministratorCannotBeDeleted()
    {
        await using var factory = await CreateScenarioAsync();
        using var client = CreateClient(factory, 101);
        using var response = await client.DeleteAsync("/api/Usuarios/101");

        await AssertContinuityConflictAsync(response);
        await AssertEnabledAdministratorsAsync(factory, 101);
    }

    [Theory]
    [InlineData("Desabilitado")]
    [InlineData("Bloqueado")]
    [InlineData("Pendente")]
    public async Task AnyStateThatWithdrawsTheLastAdministratorIsRejectedWithoutPartialProfileUpdate(string status)
    {
        await using var factory = await CreateScenarioAsync();
        using var client = CreateClient(factory, 101);
        using var response = await ChangeStatusAsync(client, 101, status);

        await AssertContinuityConflictAsync(response);
        await AssertEnabledAdministratorsAsync(factory, 101);
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal("Administrador sintético 101", (await context.Usuarios.FindAsync(101))!.NomeCompleto);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task AnotherEnabledAdministratorAllowsWithdrawal(bool delete)
    {
        await using var factory = await CreateScenarioAsync(twoEnabled: true);
        using var client = CreateClient(factory, 101);
        using var response = delete
            ? await client.DeleteAsync("/api/Usuarios/102")
            : await ChangeStatusAsync(client, 102, "Desabilitado");

        Assert.Equal(delete ? HttpStatusCode.NoContent : HttpStatusCode.OK, response.StatusCode);
        await AssertEnabledAdministratorsAsync(factory, 101);
    }

    [Fact]
    public async Task OrdinaryProfileChangesDoNotRemoveTheLastAdministrator()
    {
        await using var factory = await CreateScenarioAsync();
        using var client = CreateClient(factory, 101);
        using var response = await PatchAsync(client, 101,
            "[{\"op\":\"replace\",\"path\":\"/nomeCompleto\",\"value\":\"Nome atualizado\"}]");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await AssertEnabledAdministratorsAsync(factory, 101);
    }

    [Theory]
    [InlineData(NivelUsuario.Mentor)]
    [InlineData(NivelUsuario.Mentorado)]
    [InlineData(NivelUsuario.Comum)]
    public async Task SharedGuardRejectsEveryRoleThatWouldWithdrawTheLastAdministrator(NivelUsuario role)
    {
        await using var factory = await CreateScenarioAsync();
        await using var scope = factory.Services.CreateAsyncScope();
        var guard = scope.ServiceProvider.GetRequiredService<AdminContinuityGuard>();
        await using var transaction = await guard.BeginTransactionAsync();

        Assert.False(await guard.CanApplyAsync(101, role, StatusUsuario.Habilitado));
        await transaction.RollbackAsync();
        await AssertEnabledAdministratorsAsync(factory, 101);
    }

    [Fact]
    public async Task SharedGuardFailsClosedOutsideItsCoordinationTransaction()
    {
        await using var factory = await CreateScenarioAsync();
        await using var scope = factory.Services.CreateAsyncScope();
        var guard = scope.ServiceProvider.GetRequiredService<AdminContinuityGuard>();
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            guard.CanApplyAsync(101, NivelUsuario.Mentor, StatusUsuario.Habilitado));
    }

    [Fact]
    public async Task RoleWithdrawalSerializesDifferentTargetsAndRereadsAfterTheFirstCommit()
    {
        await using var factory = await CreateScenarioAsync(twoEnabled: true);
        await using var firstScope = factory.Services.CreateAsyncScope();
        await using var secondScope = factory.Services.CreateAsyncScope();
        var firstContext = firstScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var secondContext = secondScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var firstGuard = firstScope.ServiceProvider.GetRequiredService<AdminContinuityGuard>();
        var secondGuard = secondScope.ServiceProvider.GetRequiredService<AdminContinuityGuard>();
        await secondContext.Database.OpenConnectionAsync();
        var secondPid = ((NpgsqlConnection)secondContext.Database.GetDbConnection()).ProcessID;
        await using var firstTransaction = await firstGuard.BeginTransactionAsync();
        Assert.True(await firstGuard.CanApplyAsync(101, NivelUsuario.Mentor, StatusUsuario.Habilitado));
        var firstAdmin = await firstContext.Usuarios.SingleAsync(user => user.Id == 101);
        firstAdmin.NivelUsuario = NivelUsuario.Mentor;
        await firstContext.SaveChangesAsync();

        var waitingTransaction = secondGuard.BeginTransactionAsync();
        // Observe PostgreSQL's wait, rather than relying on two requests happening to overlap.
        await using var observer = new NpgsqlConnection(database.ConnectionString);
        await observer.OpenAsync();
        await using var command = observer.CreateCommand();
        command.CommandText = "SELECT EXISTS (SELECT 1 FROM pg_locks WHERE pid = @pid AND locktype = 'advisory' AND NOT granted)";
        command.Parameters.AddWithValue("pid", secondPid);
        var deadline = DateTime.UtcNow.AddSeconds(10);
        var isWaiting = false;
        while (!isWaiting && DateTime.UtcNow < deadline)
        {
            isWaiting = (bool)(await command.ExecuteScalarAsync())!;
            if (!isWaiting) await Task.Delay(20);
        }
        Assert.True(isWaiting, "The second context must wait at the shared PostgreSQL coordination point.");
        await firstTransaction.CommitAsync();
        await using var secondTransaction = await waitingTransaction.WaitAsync(TimeSpan.FromSeconds(10));
        Assert.False(await secondGuard.CanApplyAsync(102, NivelUsuario.Mentor, StatusUsuario.Habilitado));
        await secondTransaction.RollbackAsync();
        await AssertEnabledAdministratorsAsync(factory, 102);
    }

    [Theory]
    [InlineData(false, false)]
    [InlineData(false, true)]
    [InlineData(true, true)]
    public async Task ConcurrentWithdrawalsOfDifferentTargetsKeepOneEnabledAdministrator(bool deleteFirst, bool deleteSecond)
    {
        await using var factory = await CreateScenarioAsync(twoEnabled: true);
        using var first = CreateClient(factory, 101);
        using var second = CreateClient(factory, 102);
        var start = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        async Task<HttpResponseMessage> WithdrawAsync(HttpClient client, int target, bool delete)
        {
            await start.Task;
            return delete ? await client.DeleteAsync($"/api/Usuarios/{target}")
                : await ChangeStatusAsync(client, target, "Desabilitado");
        }
        var firstRequest = WithdrawAsync(first, 101, deleteFirst);
        var secondRequest = WithdrawAsync(second, 102, deleteSecond);
        start.SetResult();
        var responses = await Task.WhenAll(firstRequest, secondRequest);
        try
        {
            Assert.Single(responses, response => response.IsSuccessStatusCode);
            await AssertContinuityConflictAsync(Assert.Single(responses, response => !response.IsSuccessStatusCode));
            await using var scope = factory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Equal(1, await context.Usuarios.AsNoTracking().CountAsync(user =>
                user.NivelUsuario == NivelUsuario.Administrador && user.Status == StatusUsuario.Habilitado));
        }
        finally
        {
            foreach (var response in responses) response.Dispose();
        }
    }

    private async Task<IntegrationWebApplicationFactory> CreateScenarioAsync(bool twoEnabled = false)
    {
        var factory = new IntegrationWebApplicationFactory(database);
        await factory.RecreateDatabaseAsync();
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Usuarios.AddRange(
            CreateUser(101, NivelUsuario.Administrador, StatusUsuario.Habilitado),
            CreateUser(102, NivelUsuario.Administrador, twoEnabled ? StatusUsuario.Habilitado : StatusUsuario.Desabilitado),
            CreateUser(103, NivelUsuario.Administrador, StatusUsuario.Pendente),
            CreateUser(104, NivelUsuario.Mentor, StatusUsuario.Habilitado),
            CreateUser(105, NivelUsuario.Administrador, StatusUsuario.Bloqueado));
        await context.SaveChangesAsync();
        return factory;
    }

    private static Usuario CreateUser(int id, NivelUsuario role, StatusUsuario status) => new()
    {
        Id = id,
        NomeCompleto = $"Administrador sintético {id}",
        Email = $"synthetic-{id}@example.invalid",
        SenhaHash = "synthetic-unused-hash",
        TipoUsuario = TipoUsuario.Comum,
        NivelUsuario = role,
        Status = status
    };

    private static HttpClient CreateClient(IntegrationWebApplicationFactory factory, int id)
    {
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", JwtSessionVersionTests.CreateToken(id, "0", "false", NivelUsuario.Administrador));
        return client;
    }

    private static Task<HttpResponseMessage> ChangeStatusAsync(HttpClient client, int id, string status) =>
        PatchAsync(client, id,
            $"[{{\"op\":\"replace\",\"path\":\"/nomeCompleto\",\"value\":\"Não persistir em recusa\"}},{{\"op\":\"replace\",\"path\":\"/status\",\"value\":\"{status}\"}}]");

    private static async Task<HttpResponseMessage> PatchAsync(HttpClient client, int id, string patch)
    {
        using var content = new StringContent(patch, Encoding.UTF8, "application/json-patch+json");
        return await client.PatchAsync($"/api/Usuarios/{id}", content);
    }

    private static async Task AssertContinuityConflictAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("admin_continuity_required", document.RootElement.GetProperty("code").GetString());
    }

    private static async Task AssertEnabledAdministratorsAsync(IntegrationWebApplicationFactory factory, params int[] expectedIds)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(expectedIds, await context.Usuarios.AsNoTracking()
            .Where(user => user.NivelUsuario == NivelUsuario.Administrador && user.Status == StatusUsuario.Habilitado)
            .OrderBy(user => user.Id).Select(user => user.Id).ToArrayAsync());
    }
}
