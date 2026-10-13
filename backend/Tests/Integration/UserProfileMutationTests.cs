using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Security.Cryptography;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;
using LabSolos_Server_DotNet8.Services.Security;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class UserProfileMutationTests(PostgreSqlContainerFixture database)
{
    private static readonly byte[] KeyHashSecret = SHA256.HashData(
        Encoding.UTF8.GetBytes("T012 synthetic key-hash secret for isolated tests"));

    [Fact]
    public async Task MentorCannotPatchAnotherProfileAndGetsTheSameNotFoundResponseAsAMissingProfile()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            using var mentor = CreateClient(factory, scenario.MentorOneId, NivelUsuario.Mentor);

            using var crossResponse = await PatchAsync(
                mentor,
                scenario.MenteeTwoId,
                "[{\"op\":\"replace\",\"path\":\"/nomeCompleto\",\"value\":\"Intruso\"}]");
            using var missingResponse = await PatchAsync(
                mentor,
                999999,
                "[{\"op\":\"replace\",\"path\":\"/nomeCompleto\",\"value\":\"Intruso\"}]");

            Assert.Equal(HttpStatusCode.NotFound, crossResponse.StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, missingResponse.StatusCode);
            Assert.Equal(
                await missingResponse.Content.ReadAsStringAsync(),
                await crossResponse.Content.ReadAsStringAsync());

            await using var scope = factory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var target = await context.Usuarios.SingleAsync(user => user.Id == scenario.MenteeTwoId);
            Assert.Equal($"Usuário mentee-two-{scenario.ScenarioToken}", target.NomeCompleto);
        }
    }

    [Fact]
    public async Task OwnerCannotChangeEmailWithoutCurrentPasswordAndTheDatabaseRemainsUnchanged()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            using var owner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
            using var response = await PatchAsync(
                owner,
                scenario.MenteeOneId,
                "[{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"changed@example.invalid\"}]");

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.Equal(
                "current_password_invalid",
                payload.RootElement.GetProperty("errors").GetProperty("senhaAtual")[0].GetString());

            await using var scope = factory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var ownerRecord = await context.Usuarios.SingleAsync(user => user.Id == scenario.MenteeOneId);
            Assert.Equal(scenario.MenteeOneEmail, ownerRecord.Email);
        }
    }

    [Fact]
    public async Task OwnerMayUpdateNameAndPhoneButCannotMixEitherWithStatus()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            using var owner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
            using var allowedResponse = await PatchAsync(
                owner,
                scenario.MenteeOneId,
                "[{\"op\":\"replace\",\"path\":\"/nomeCompleto\",\"value\":\"Nome atualizado\"},{\"op\":\"replace\",\"path\":\"/telefone\",\"value\":\"81999990000\"}]");
            Assert.Equal(HttpStatusCode.OK, allowedResponse.StatusCode);

            using var mixedResponse = await PatchAsync(
                owner,
                scenario.MenteeOneId,
                "[{\"op\":\"replace\",\"path\":\"/nomeCompleto\",\"value\":\"Nome parcial\"},{\"op\":\"replace\",\"path\":\"/status\",\"value\":\"Desabilitado\"}]");
            Assert.Equal(HttpStatusCode.Forbidden, mixedResponse.StatusCode);

            await using var scope = factory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await context.Usuarios.SingleAsync(candidate => candidate.Id == scenario.MenteeOneId);
            Assert.Equal("Nome atualizado", user.NomeCompleto);
            Assert.Equal("81999990000", user.Telefone);
            Assert.Equal(StatusUsuario.Habilitado, user.Status);
        }
    }

    [Fact]
    public async Task AdministratorCanManageAnotherProfileAndItsStatusWithoutTheOtherUsersPassword()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            using var administrator = CreateClient(factory, scenario.AdministratorId, NivelUsuario.Administrador);
            using var response = await PatchAsync(
                administrator,
                scenario.MenteeOneId,
                "[{\"op\":\"replace\",\"path\":\"/nomeCompleto\",\"value\":\"Administrado\"},{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"admin-managed@example.invalid\"},{\"op\":\"replace\",\"path\":\"/status\",\"value\":\"Desabilitado\"}]");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            await using var scope = factory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await context.Usuarios.SingleAsync(candidate => candidate.Id == scenario.MenteeOneId);
            Assert.Equal("Administrado", user.NomeCompleto);
            Assert.Equal("admin-managed@example.invalid", user.Email);
            Assert.Equal(StatusUsuario.Desabilitado, user.Status);
        }
    }

    [Fact]
    public async Task OwnerEmailChangeRequiresCorrectPasswordAndCancelsRecoveryWithoutRevokingSession()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            const string replacementEmail = "new-owner@example.invalid";
            var currentPassword = scenario.MenteeOnePassword;
            var initialVersion = await AddRecoveryStateAsync(factory, scenario.MenteeOneId);
            using var owner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
            using var response = await PatchAsync(
                owner,
                scenario.MenteeOneId,
                $"[{{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"new-owner@example.invalid\"}},{{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"{currentPassword}\"}}]");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var responseBody = await response.Content.ReadAsStringAsync();
            Assert.DoesNotContain("senhaAtual", responseBody, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain(currentPassword, responseBody, StringComparison.Ordinal);
            using var responsePayload = JsonDocument.Parse(responseBody);
            Assert.Equal(replacementEmail, responsePayload.RootElement.GetProperty("email").GetString());

            await using var scope = factory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await context.Usuarios.SingleAsync(candidate => candidate.Id == scenario.MenteeOneId);
            Assert.Equal(replacementEmail, user.Email);
            Assert.Null(user.TokenRedefinicaoHash);
            Assert.Null(user.TokenExpiracao);
            Assert.Equal(initialVersion, user.VersaoSessao);
            var cancelledJobs = await context.PasswordRecoveryJobs.OrderBy(job => job.UserId).ToListAsync();
            Assert.Equal(2, cancelledJobs.Count);
            Assert.All(cancelledJobs, job =>
            {
                Assert.Equal(PasswordRecoveryJobStatus.Cancelled, job.Status);
                Assert.Empty(job.PayloadCiphertext);
                Assert.Equal(string.Empty, job.EncryptionKeyId);
            });
            var capacity = await context.AuthenticationProtectionCapacities.SingleAsync(
                entry => entry.Scope == AuthenticationProtectionCapacity.RecoveryJobs);
            Assert.Equal(0, capacity.Allocated);

            var credentialService = scope.ServiceProvider.GetRequiredService<
                LabSolos_Server_DotNet8.Services.Security.ICredentialService>();
            var recovery = await credentialService.RequestPasswordResetAsync(replacementEmail);
            Assert.Equal(replacementEmail, recovery.RecipientEmail);
        }
    }

    [Fact]
    public async Task WrongPasswordAndDuplicateEmailReturnSafeErrorsWithoutPartialMutation()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            using var owner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
            using var invalidPasswordResponse = await PatchAsync(
                owner,
                scenario.MenteeOneId,
                "[{\"op\":\"replace\",\"path\":\"/nomeCompleto\",\"value\":\"Não persistir\"},{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"unused@example.invalid\"},{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"WrongSyntheticPassword!2026\"}]");
            Assert.Equal(HttpStatusCode.BadRequest, invalidPasswordResponse.StatusCode);

            using var duplicateEmailResponse = await PatchAsync(
                owner,
                scenario.MenteeOneId,
                $"[{{\"op\":\"replace\",\"path\":\"/nomeCompleto\",\"value\":\"Não persistir\"}},{{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"{scenario.MentorOneEmail}\"}},{{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"{scenario.MenteeOnePassword}\"}}]");
            Assert.Equal(HttpStatusCode.Conflict, duplicateEmailResponse.StatusCode);
            var conflictBody = await duplicateEmailResponse.Content.ReadAsStringAsync();
            Assert.Contains("profile_update_conflict", conflictBody, StringComparison.Ordinal);
            Assert.DoesNotContain(scenario.MentorOneEmail, conflictBody, StringComparison.Ordinal);

            await using var scope = factory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await context.Usuarios.SingleAsync(candidate => candidate.Id == scenario.MenteeOneId);
            Assert.Equal($"Usuário mentee-one-{scenario.ScenarioToken}", user.NomeCompleto);
            Assert.Equal(scenario.MenteeOneEmail, user.Email);
        }
    }

    [Theory]
    [InlineData("[{\"op\":\"remove\",\"path\":\"/nomeCompleto\"}]")]
    [InlineData("[{\"op\":\"add\",\"path\":\"/nomeCompleto\",\"value\":\"x\"}]")]
    [InlineData("[{\"op\":\"move\",\"from\":\"/telefone\",\"path\":\"/email\"}]")]
    [InlineData("[{\"op\":\"copy\",\"from\":\"/telefone\",\"path\":\"/email\"}]")]
    [InlineData("[{\"op\":\"replace\",\"path\":\"/nomeCompleto/length\",\"value\":\"x\"}]")]
    [InlineData("[{\"op\":\"replace\",\"path\":\"/NomeCompleto\",\"value\":\"x\"}]")]
    [InlineData("[{\"op\":\"replace\",\"path\":\"/nomeCompleto\",\"value\":\"x\",\"from\":\"/telefone\"}]")]
    public async Task UnsupportedJsonPatchOperationsAndPathsReturnBadRequest(string patch)
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            using var owner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
            using var response = await PatchAsync(owner, scenario.MenteeOneId, patch);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            await using var scope = factory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await context.Usuarios.SingleAsync(candidate => candidate.Id == scenario.MenteeOneId);
            Assert.Equal($"Usuário mentee-one-{scenario.ScenarioToken}", user.NomeCompleto);
        }
    }

    [Fact]
    public async Task JsonPatchDocumentIsLimitedToTenOperations()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            var operations = Enumerable.Range(1, 11)
                .Select(index => $"{{\"op\":\"replace\",\"path\":\"/nomeCompleto\",\"value\":\"Nome {index}\"}}");
            using var owner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
            using var response = await PatchAsync(owner, scenario.MenteeOneId, $"[{string.Join(',', operations)}]");
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            await using var scope = factory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await context.Usuarios.SingleAsync(candidate => candidate.Id == scenario.MenteeOneId);
            Assert.Equal($"Usuário mentee-one-{scenario.ScenarioToken}", user.NomeCompleto);
        }
    }

    [Fact]
    public async Task AdministratorMustConfirmPasswordForOwnEmailChange()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            using var administrator = CreateClient(factory, scenario.AdministratorId, NivelUsuario.Administrador);
            using var response = await PatchAsync(
                administrator,
                scenario.AdministratorId,
                "[{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"admin-new@example.invalid\"}]");
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            using var confirmedResponse = await PatchAsync(
                administrator,
                scenario.AdministratorId,
                $"[{{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"admin-new@example.invalid\"}},{{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"{scenario.AdministratorPassword}\"}}]");
            Assert.Equal(HttpStatusCode.OK, confirmedResponse.StatusCode);
        }
    }

    [Fact]
    public async Task DuplicateCurrentPasswordOperationIsRejectedBeforeApplyingAnyField()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            using var owner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
            using var response = await PatchAsync(
                owner,
                scenario.MenteeOneId,
                $"[{{\"op\":\"replace\",\"path\":\"/nomeCompleto\",\"value\":\"Não persistir\"}},{{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"{scenario.MenteeOnePassword}\"}},{{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"{scenario.MenteeOnePassword}\"}}]");
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            await using var scope = factory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await context.Usuarios.SingleAsync(candidate => candidate.Id == scenario.MenteeOneId);
            Assert.Equal($"Usuário mentee-one-{scenario.ScenarioToken}", user.NomeCompleto);
        }
    }

    [Fact]
    public async Task EmailChangeFailsClosedWhenTheExactDeliveryKeyIsNotConfigured()
    {
        var (factory, scenario) = await CreateScenarioAsync(registerDeliveryKeyFactory: false);
        await using (factory)
        {
            using var owner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
            using var response = await PatchAsync(
                owner,
                scenario.MenteeOneId,
                $"[{{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"new-owner@example.invalid\"}},{{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"{scenario.MenteeOnePassword}\"}}]");

            Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
            await using var scope = factory.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await context.Usuarios.SingleAsync(candidate => candidate.Id == scenario.MenteeOneId);
            Assert.Equal(scenario.MenteeOneEmail, user.Email);
        }
    }

    private async Task<(IntegrationWebApplicationFactory Factory, AuthenticationProtectionScenarioData Scenario)> CreateScenarioAsync(
        bool registerDeliveryKeyFactory = true)
    {
        var factory = new IntegrationWebApplicationFactory(
            database,
            registerDeliveryKeyFactory
                ? new IntegrationApplicationOptions
            {
                ConfigureServices = services => services.AddSingleton<ThrottleKeyFactory>(
                    _ => new ThrottleKeyFactory(KeyHashSecret, "IntegrationTesting"))
            }
                : null);
        await factory.RecreateDatabaseAsync();

        var scenario = AuthenticationProtectionScenarioData.Create($"T012-{Guid.NewGuid():N}");
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<
            Microsoft.AspNetCore.Identity.IPasswordHasher<Usuario>>();
        await scenario.PersistAsync(context, passwordHasher);
        return (factory, scenario);
    }

    private static async Task<long> AddRecoveryStateAsync(IntegrationWebApplicationFactory factory, int userId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await context.Usuarios.SingleAsync(candidate => candidate.Id == userId);
        user.TokenRedefinicaoHash = "prior-reset-token-hash";
        user.TokenExpiracao = DateTime.UtcNow.AddMinutes(10);
        var now = DateTimeOffset.UtcNow;
        var keyFactory = scope.ServiceProvider.GetRequiredService<ThrottleKeyFactory>();
        context.PasswordRecoveryJobs.Add(new PasswordRecoveryJob
        {
            Id = Guid.NewGuid(),
            DeliveryKeyHash = Enumerable.Repeat((byte)1, 32).ToArray(),
            RecipientKeyHash = Enumerable.Repeat((byte)2, 32).ToArray(),
            PayloadCiphertext = [1, 2, 3],
            PayloadNonce = new byte[12],
            PayloadTag = new byte[16],
            EncryptionKeyId = "synthetic-key",
            CreatedAt = now,
            ExpiresAt = now.AddMinutes(10),
            NextAttemptAt = now,
            Status = PasswordRecoveryJobStatus.Pending,
            Attempts = 0,
            UserId = userId,
            SessionVersion = user.VersaoSessao
        });
        context.PasswordRecoveryJobs.Add(new PasswordRecoveryJob
        {
            Id = Guid.NewGuid(),
            DeliveryKeyHash = keyFactory.CreateRecoveryDeliveryKey(user.Email),
            RecipientKeyHash = Enumerable.Repeat((byte)3, 32).ToArray(),
            PayloadCiphertext = [4, 5, 6],
            PayloadNonce = new byte[12],
            PayloadTag = new byte[16],
            EncryptionKeyId = "synthetic-key",
            CreatedAt = now,
            ExpiresAt = now.AddMinutes(10),
            NextAttemptAt = now,
            Status = PasswordRecoveryJobStatus.Pending,
            Attempts = 0
        });
        var capacity = await context.AuthenticationProtectionCapacities.SingleAsync(
            entry => entry.Scope == AuthenticationProtectionCapacity.RecoveryJobs);
        capacity.Allocated += 2;
        await context.SaveChangesAsync();
        return user.VersaoSessao;
    }

    private static HttpClient CreateClient(
        IntegrationWebApplicationFactory factory,
        int userId,
        NivelUsuario role)
    {
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            JwtSessionVersionTests.CreateToken(userId, "0", "false", role));
        return client;
    }

    private static async Task<HttpResponseMessage> PatchAsync(HttpClient client, int userId, string jsonPatch)
    {
        using var request = new HttpRequestMessage(HttpMethod.Patch, $"https://localhost/api/Usuarios/{userId}")
        {
            Content = new StringContent(jsonPatch, Encoding.UTF8, "application/json-patch+json")
        };
        return await client.SendAsync(request);
    }
}
