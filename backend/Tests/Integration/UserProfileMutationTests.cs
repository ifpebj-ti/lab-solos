using System.Net;
using System.Net.Http.Json;
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
using Npgsql;

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
                await ApiProblemContractAssertions.ReadAsync(
                    missingResponse, HttpStatusCode.NotFound, "resource_not_found"),
                await ApiProblemContractAssertions.ReadAsync(
                    crossResponse, HttpStatusCode.NotFound, "resource_not_found"));

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
                $"[{{\"op\":\"replace\",\"path\":\"/nomeCompleto\",\"value\":\"Administrado\"}},{{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"admin-managed@example.invalid\"}},{{\"op\":\"replace\",\"path\":\"/status\",\"value\":\"Desabilitado\"}},{{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"{scenario.AdministratorPassword}\"}}]");

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
            // Public, generated test fixture; this value is intentionally sent only to the in-process TestServer.
            var syntheticCredential = scenario.MenteeOnePassword;
            var initialVersion = await AddRecoveryStateAsync(factory, scenario.MenteeOneId);
            using var owner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
            using var response = await PatchAsync(
                owner,
                scenario.MenteeOneId,
                $"[{{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"new-owner@example.invalid\"}},{{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"{syntheticCredential}\"}}]");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var responseBody = await response.Content.ReadAsStringAsync();
            Assert.DoesNotContain("senhaAtual", responseBody, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain(syntheticCredential, responseBody, StringComparison.Ordinal);
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

    [Fact]
    public async Task AdministratorMustConfirmOwnPasswordAndSuccessfulChangeWritesAuditReservationAndTwoNotices()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            using var administrator = CreateClient(factory, scenario.AdministratorId, NivelUsuario.Administrador);

            using var missingConfirmation = await PatchAsync(
                administrator,
                scenario.MenteeOneId,
                "[{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"admin-managed-new@example.invalid\"}]");
            Assert.Equal(HttpStatusCode.BadRequest, missingConfirmation.StatusCode);

            await using (var scope = factory.Services.CreateAsyncScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var unchanged = await context.Usuarios.SingleAsync(user => user.Id == scenario.MenteeOneId);
                Assert.Equal(scenario.MenteeOneEmail, unchanged.Email);
                Assert.Empty(await context.LogsAuditoria
                    .Where(log => log.CodigoEvento == CodigoEventoAuditoria.TrocaEmail)
                    .ToListAsync());
            }

            using var confirmed = await PatchAsync(
                administrator,
                scenario.MenteeOneId,
                $"[{{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"admin-managed-new@example.invalid\"}},{{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"{scenario.AdministratorPassword}\"}}]");
            Assert.Equal(HttpStatusCode.OK, confirmed.StatusCode);

            await using var verifyScope = factory.Services.CreateAsyncScope();
            var verified = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var updated = await verified.Usuarios.SingleAsync(user => user.Id == scenario.MenteeOneId);
            Assert.Equal("admin-managed-new@example.invalid", updated.Email);

            var noticeJobs = await verified.EmailChangeNoticeJobs
                .Where(job => job.UserId == scenario.MenteeOneId)
                .ToListAsync();
            Assert.Equal(2, noticeJobs.Count);
            Assert.All(noticeJobs, job =>
            {
                Assert.Equal(EmailChangeNoticeStatus.Pending, job.Status);
                Assert.Equal(0, job.Attempts);
                Assert.Equal(TimeSpan.FromHours(24), job.DeadlineAt - job.CreatedAt);
                Assert.Equal(TimeSpan.FromDays(30), job.RetainUntil - job.CreatedAt);
                Assert.DoesNotContain("admin-managed-new@example.invalid", Encoding.UTF8.GetString(job.PayloadCiphertext), StringComparison.Ordinal);
                Assert.DoesNotContain(scenario.MenteeOneEmail, Encoding.UTF8.GetString(job.PayloadCiphertext), StringComparison.Ordinal);
            });

            var audit = await verified.LogsAuditoria.SingleAsync(log =>
                log.CodigoEvento == CodigoEventoAuditoria.TrocaEmail &&
                log.UsuarioId == scenario.AdministratorId);
            Assert.Equal($"conta:usuario:{scenario.MenteeOneId}", audit.Recurso);
            Assert.Equal(ResultadoOperacaoAuditoria.Sucesso, audit.Resultado);

            await using var connection = new NpgsqlConnection(database.ConnectionString);
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT
                    (SELECT COUNT(*) FROM "EmailAddressReservations" WHERE "OwnerUserId" = @ownerId),
                    (SELECT COUNT(*) FROM "EmailChangeNoticeJobs" WHERE "UserId" = @ownerId)
                """;
            command.Parameters.AddWithValue("ownerId", scenario.MenteeOneId);
            await using var reader = await command.ExecuteReaderAsync();
            Assert.True(await reader.ReadAsync());
            Assert.Equal(1L, reader.GetInt64(0));
            Assert.Equal(2L, reader.GetInt64(1));
        }
    }

    [Fact]
    public async Task ReservedAddressCannotBeClaimedByAnotherAccountButOwnerCanReclaimIt()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            using var owner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
            using var administrator = CreateClient(factory, scenario.AdministratorId, NivelUsuario.Administrador);

            using var firstChange = await PatchAsync(
                owner,
                scenario.MenteeOneId,
                $"[{{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"owner-new@example.invalid\"}},{{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"{scenario.MenteeOnePassword}\"}}]");
            Assert.Equal(HttpStatusCode.OK, firstChange.StatusCode);

            using var publicClient = factory.CreateClient();
            using var reservedRegistration = await publicClient.PostAsJsonAsync("/api/Usuarios", new
            {
                nomeCompleto = "Tentativa sintética de reutilização",
                email = scenario.MenteeOneEmail.ToUpperInvariant(),
                senha = "T010-Registration-Synthetic-Password!",
                nivelUsuario = "Mentor",
                tipoUsuario = "Academico",
                instituicao = "IFPE",
                cidade = "Belo Jardim",
                curso = "ES"
            });
            Assert.Equal(HttpStatusCode.Conflict, reservedRegistration.StatusCode);

            using var otherAccountClaim = await PatchAsync(
                administrator,
                scenario.MenteeTwoId,
                $"[{{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"{scenario.MenteeOneEmail}\"}},{{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"{scenario.AdministratorPassword}\"}}]");
            Assert.Equal(HttpStatusCode.Conflict, otherAccountClaim.StatusCode);

            using var ownerReclaim = await PatchAsync(
                owner,
                scenario.MenteeOneId,
                $"[{{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"{scenario.MenteeOneEmail.ToUpperInvariant()}\"}},{{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"{scenario.MenteeOnePassword}\"}}]");
            Assert.Equal(HttpStatusCode.OK, ownerReclaim.StatusCode);
        }
    }

    [Fact]
    public async Task ConcurrentEmailChangesWithDifferentCaseAllowOnlyOneNormalizedAddress()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            using var firstOwner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
            using var secondOwner = CreateClient(factory, scenario.MenteeTwoId, NivelUsuario.Mentorado);
            const string address = "shared-normalized@example.invalid";

            var responses = await Task.WhenAll(
                PatchAsync(firstOwner, scenario.MenteeOneId,
                    $"[{{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"{address}\"}},{{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"{scenario.MenteeOnePassword}\"}}]"),
                PatchAsync(secondOwner, scenario.MenteeTwoId,
                    $"[{{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"{address.ToUpperInvariant()}\"}},{{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"{scenario.MenteeTwoPassword}\"}}]"));
            using var first = responses[0];
            using var second = responses[1];

            Assert.Single(responses, response => response.StatusCode == HttpStatusCode.OK);
            Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Conflict);
        }
    }

    [Fact]
    public async Task FormerAddressCanBeClaimedAtTheSevenDayBoundary()
    {
        var clock = new ControlledTimeProvider(new DateTimeOffset(2026, 11, 1, 12, 0, 0, TimeSpan.Zero));
        var (factory, scenario) = await CreateScenarioAsync(timeProvider: clock);
        await using (factory)
        {
            using var owner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
            using var administrator = CreateClient(factory, scenario.AdministratorId, NivelUsuario.Administrador);

            using var change = await PatchAsync(
                owner,
                scenario.MenteeOneId,
                $"[{{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"boundary-new@example.invalid\"}},{{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"{scenario.MenteeOnePassword}\"}}]");
            Assert.Equal(HttpStatusCode.OK, change.StatusCode);

            clock.Advance(TimeSpan.FromDays(7) - TimeSpan.FromTicks(1));
            using var beforeBoundary = await PatchAsync(
                administrator,
                scenario.MenteeTwoId,
                $"[{{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"{scenario.MenteeOneEmail}\"}},{{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"{scenario.AdministratorPassword}\"}}]");
            Assert.Equal(HttpStatusCode.Conflict, beforeBoundary.StatusCode);

            clock.Advance(TimeSpan.FromTicks(1));
            using var atBoundary = await PatchAsync(
                administrator,
                scenario.MenteeTwoId,
                $"[{{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"{scenario.MenteeOneEmail.ToUpperInvariant()}\"}},{{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"{scenario.AdministratorPassword}\"}}]");
            Assert.Equal(HttpStatusCode.OK, atBoundary.StatusCode);
        }
    }

    [Fact]
    public async Task MandatoryAuditPersistenceFailureRollsBackEmailReservationAndNoticeJobs()
    {
        var (factory, scenario) = await CreateScenarioAsync();
        await using (factory)
        {
            await using (var connection = new NpgsqlConnection(database.ConnectionString))
            {
                await connection.OpenAsync();
                await using var createTrigger = connection.CreateCommand();
                createTrigger.CommandText = """
                    CREATE FUNCTION reject_synthetic_email_change_audit() RETURNS trigger LANGUAGE plpgsql AS $$
                    BEGIN
                        IF NEW."CodigoEvento" = 'TrocaEmail' THEN
                            RAISE EXCEPTION 'synthetic required-audit failure' USING ERRCODE = '23514';
                        END IF;
                        RETURN NEW;
                    END;
                    $$;
                    CREATE TRIGGER reject_synthetic_email_change_audit
                    BEFORE INSERT ON "LogsAuditoria"
                    FOR EACH ROW EXECUTE FUNCTION reject_synthetic_email_change_audit();
                    """;
                await createTrigger.ExecuteNonQueryAsync();
            }

            try
            {
                using var owner = CreateClient(factory, scenario.MenteeOneId, NivelUsuario.Mentorado);
                using var response = await PatchAsync(
                    owner,
                    scenario.MenteeOneId,
                    $"[{{\"op\":\"replace\",\"path\":\"/email\",\"value\":\"must-rollback@example.invalid\"}},{{\"op\":\"replace\",\"path\":\"/senhaAtual\",\"value\":\"{scenario.MenteeOnePassword}\"}}]");
                Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);

                await using var scope = factory.Services.CreateAsyncScope();
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var user = await context.Usuarios.SingleAsync(candidate => candidate.Id == scenario.MenteeOneId);
                Assert.Equal(scenario.MenteeOneEmail, user.Email);
                Assert.Empty(await context.EmailAddressReservations.ToListAsync());
                Assert.Empty(await context.EmailChangeNoticeJobs.ToListAsync());
                Assert.Empty(await context.LogsAuditoria.Where(log =>
                    log.CodigoEvento == CodigoEventoAuditoria.TrocaEmail).ToListAsync());
            }
            finally
            {
                await using var connection = new NpgsqlConnection(database.ConnectionString);
                await connection.OpenAsync();
                await using var removeTrigger = connection.CreateCommand();
                removeTrigger.CommandText = """
                    DROP TRIGGER IF EXISTS reject_synthetic_email_change_audit ON "LogsAuditoria";
                    DROP FUNCTION IF EXISTS reject_synthetic_email_change_audit();
                    """;
                await removeTrigger.ExecuteNonQueryAsync();
            }
        }
    }

    private async Task<(IntegrationWebApplicationFactory Factory, AuthenticationProtectionScenarioData Scenario)> CreateScenarioAsync(
        bool registerDeliveryKeyFactory = true,
        TimeProvider? timeProvider = null)
    {
        var useDefaultOptions = !registerDeliveryKeyFactory && timeProvider is null;
        IntegrationApplicationOptions? applicationOptions = useDefaultOptions
            ? null
            : new IntegrationApplicationOptions
            {
                TimeProvider = timeProvider ?? TimeProvider.System,
                ConfigureServices = registerDeliveryKeyFactory
                    ? services => services.AddSingleton<ThrottleKeyFactory>(
                        _ => new ThrottleKeyFactory(KeyHashSecret, "IntegrationTesting"))
                    : null
            };
        var factory = new IntegrationWebApplicationFactory(
            database,
            applicationOptions);
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
