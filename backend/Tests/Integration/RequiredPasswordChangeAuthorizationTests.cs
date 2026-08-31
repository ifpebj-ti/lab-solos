using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tests.Infrastructure;

namespace Tests.Integration;

[Collection(PostgreSqlIntegrationCollection.Name)]
public sealed class RequiredPasswordChangeAuthorizationTests(PostgreSqlContainerFixture database)
{
    [Fact]
    public async Task PendingPasswordChange_IsForbiddenFromPrivateApi_ButCanChangePasswordAndLoginAgain()
    {
        await using var factory = new IntegrationWebApplicationFactory(database, new()
        {
            Configuration = new Dictionary<string, string?>
            {
                ["Jwt:ExpiresInMinutes"] = "5"
            }
        });
        await factory.RecreateDatabaseAsync();
        await SeedPendingUserAsync(factory);
        var oldToken = JwtSessionVersionTests.CreateToken(
            42,
            "3",
            "true",
            NivelUsuario.Administrador);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", oldToken);

        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/Usuarios")).StatusCode);

        var change = await client.PostAsJsonAsync("/api/Auth/change-password", new
        {
            currentPassword = CurrentPassword,
            newPassword = NewPassword,
            confirmation = NewPassword
        });
        Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/Usuarios")).StatusCode);

        client.DefaultRequestHeaders.Authorization = null;
        var login = await client.PostAsJsonAsync("/api/Auth/login", new
        {
            email = "integration@example.test",
            password = NewPassword
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        using var payload = JsonDocument.Parse(await login.Content.ReadAsStringAsync());
        Assert.False(payload.RootElement.GetProperty("requiresPasswordChange").GetBoolean());
        var newToken = payload.RootElement.GetProperty("token").GetString();

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", newToken);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/Usuarios")).StatusCode);
    }

    private static async Task SeedPendingUserAsync(IntegrationWebApplicationFactory factory)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = JwtSessionVersionTests.CreateUser(userLevel: NivelUsuario.Administrador);
        user.ExigeTrocaSenha = true;
        user.SenhaHash = new PasswordHasher<LabSolos_Server_DotNet8.Models.Usuario>()
            .HashPassword(user, CurrentPassword);
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
    }

    private const string CurrentPassword = "valid current password 2026";
    private const string NewPassword = "a completely new password 2026";
}
