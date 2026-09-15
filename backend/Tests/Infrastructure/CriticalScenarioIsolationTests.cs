using System.Net;
using System.Net.Http.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Tests.Infrastructure;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class CriticalScenarioIsolationTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task ConsecutiveScenariosResetDataAndDoNotInheritPrivilegedUsers()
    {
        var clock = new ControlledTimeProvider(
            new DateTimeOffset(2026, 9, 14, 12, 0, 0, TimeSpan.Zero));
        var firstScenario = CriticalScenarioData.Create("isolation-first", includeAdministrator: true);

        await using (var firstFactory = CreateFactory(clock))
        {
            await firstFactory.RecreateDatabaseAsync();
            await PersistScenarioAsync(firstFactory, firstScenario, clock);

            using var client = firstFactory.CreateClient();
            using var login = await client.PostAsJsonAsync(
                "/api/Auth/login",
                new
                {
                    email = firstScenario.BorrowerEmail,
                    password = firstScenario.BorrowerPassword
                });

            Assert.True(
                login.IsSuccessStatusCode,
                await login.Content.ReadAsStringAsync());

            await using var scope = firstFactory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Equal(3, await context.Usuarios.CountAsync());
            Assert.Single(await context.Produtos.ToListAsync());
            Assert.Single(await context.Emprestimos.Include(loan => loan.Produtos).ToListAsync());
            Assert.Equal(
                firstScenario.BorrowerId,
                (await context.Emprestimos.SingleAsync()).SolicitanteId);
        }

        var secondScenario = CriticalScenarioData.Create("isolation-second", includeAdministrator: false);
        await using (var secondFactory = CreateFactory(clock))
        {
            await secondFactory.RecreateDatabaseAsync();
            await PersistScenarioAsync(secondFactory, secondScenario, clock);

            using var client = secondFactory.CreateClient();
            using var previousScenarioLogin = await client.PostAsJsonAsync(
                "/api/Auth/login",
                new
                {
                    email = firstScenario.BorrowerEmail,
                    password = firstScenario.BorrowerPassword
                });
            using var currentScenarioLogin = await client.PostAsJsonAsync(
                "/api/Auth/login",
                new
                {
                    email = secondScenario.BorrowerEmail,
                    password = secondScenario.BorrowerPassword
                });

            Assert.Equal(HttpStatusCode.Unauthorized, previousScenarioLogin.StatusCode);
            Assert.True(
                currentScenarioLogin.IsSuccessStatusCode,
                await currentScenarioLogin.Content.ReadAsStringAsync());

            await using var scope = secondFactory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Equal(1, await context.Usuarios.CountAsync());
            Assert.Equal(0, await context.Usuarios.CountAsync(user =>
                user.TipoUsuario == TipoUsuario.Administrador));
            Assert.DoesNotContain(
                firstScenario.BorrowerEmail,
                await context.Usuarios.Select(user => user.Email).ToListAsync());
            Assert.Equal(secondScenario.BorrowerId, (await context.Emprestimos.SingleAsync()).SolicitanteId);
        }
    }

    [Fact]
    public async Task ScenarioDataUsesApplicationHasherAndControlledClock()
    {
        var clock = new ControlledTimeProvider(
            new DateTimeOffset(2026, 9, 15, 8, 30, 0, TimeSpan.Zero));
        var scenario = CriticalScenarioData.Create("deterministic-data", includeAdministrator: true);

        await using var factory = CreateFactory(clock);
        await factory.RecreateDatabaseAsync();
        await PersistScenarioAsync(factory, scenario, clock);

        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<LabSolos_Server_DotNet8.Models.Usuario>>();
        var borrower = await context.Usuarios.SingleAsync(user => user.Id == scenario.BorrowerId);
        var loan = await context.Emprestimos
            .Include(candidate => candidate.Produtos)
            .SingleAsync(candidate => candidate.Id == scenario.LoanId);
        var product = await context.Produtos.SingleAsync(candidate => candidate.Id == scenario.ProductId);

        Assert.Equal(
            PasswordVerificationResult.Success,
            passwordHasher.VerifyHashedPassword(borrower, borrower.SenhaHash, scenario.BorrowerPassword));
        Assert.Equal(clock.GetUtcNow().UtcDateTime, loan.DataRealizacao);
        Assert.Equal(clock.GetUtcNow().UtcDateTime, product.UltimaModificacao);
        Assert.Equal(scenario.ProductId, Assert.Single(loan.Produtos).ProdutoId);
        Assert.Equal(CriticalScenarioData.LoanQuantity, Assert.Single(loan.Produtos).Quantidade);
    }

    private IntegrationWebApplicationFactory CreateFactory(ControlledTimeProvider clock) =>
        new(database, new IntegrationApplicationOptions
        {
            EnvironmentName = "IntegrationTesting",
            TimeProvider = clock
        });

    private static async Task PersistScenarioAsync(
        IntegrationWebApplicationFactory factory,
        CriticalScenarioData scenario,
        TimeProvider clock)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var passwordHasher = scope.ServiceProvider
            .GetRequiredService<IPasswordHasher<LabSolos_Server_DotNet8.Models.Usuario>>();

        await scenario.PersistAsync(context, passwordHasher, clock);
    }
}
