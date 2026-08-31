using System.Security.Claims;
using System.Text.Json;
using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.DTOs.Auth;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;

namespace Tests.Controllers;

public class AuthChangePasswordTests
{
    [Fact]
    public void ChangePasswordDto_DoesNotAcceptClientProvidedIdentity()
    {
        var propertyNames = typeof(ChangePasswordDTO).GetProperties().Select(p => p.Name).ToArray();

        Assert.Equal(
            [nameof(ChangePasswordDTO.CurrentPassword), nameof(ChangePasswordDTO.NewPassword), nameof(ChangePasswordDTO.Confirmation)],
            propertyNames);
    }

    [Fact]
    public async Task ChangePassword_DerivesUserIdFromAuthenticatedSubjectAndReturnsNoContent()
    {
        var credentials = new Mock<ICredentialService>();
        credentials.Setup(service => service.ChangePasswordAsync(
                42,
                "current-password",
                "valid-new-password",
                "valid-new-password",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(CredentialChangeResult.Success());
        var controller = CreateController(credentials.Object, "42");

        var result = await controller.ChangePassword(new ChangePasswordDTO
        {
            CurrentPassword = "current-password",
            NewPassword = "valid-new-password",
            Confirmation = "valid-new-password"
        }, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        credentials.VerifyAll();
    }

    [Theory]
    [InlineData("current_password_invalid", "currentPassword")]
    [InlineData("password_confirmation_mismatch", "confirmation")]
    [InlineData("password_common", "newPassword")]
    public async Task ChangePassword_ValidationFailure_ReturnsStableProblemDetails(
        string code,
        string expectedField)
    {
        var credentials = new Mock<ICredentialService>();
        credentials.Setup(service => service.ChangePasswordAsync(
                42,
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(CredentialChangeResult.ValidationFailed(code));
        var controller = CreateController(credentials.Object, "42");

        var result = await controller.ChangePassword(new ChangePasswordDTO(), CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, objectResult.StatusCode);
        var details = Assert.IsType<ValidationProblemDetails>(objectResult.Value);
        Assert.Equal("https://httpstatuses.com/400", details.Type);
        Assert.Contains(details.Errors[expectedField], value => value == code);
        var serialized = JsonSerializer.Serialize(objectResult.Value);
        Assert.DoesNotContain("current-password", serialized);
        Assert.DoesNotContain("valid-new-password", serialized);
        Assert.DoesNotContain("hash", serialized, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("jwt", serialized, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ChangePassword_ConcurrencyFailure_ReturnsConflictProblemDetails()
    {
        var credentials = new Mock<ICredentialService>();
        credentials.Setup(service => service.ChangePasswordAsync(
                42,
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(CredentialChangeResult.Conflict());
        var controller = CreateController(credentials.Object, "42");

        var result = await controller.ChangePassword(new ChangePasswordDTO(), CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, objectResult.StatusCode);
        var details = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal("credential_concurrency_conflict", details.Extensions["code"]);
    }

    [Fact]
    public async Task ChangePassword_MissingOrMalformedSubject_ReturnsUnauthorizedWithoutCallingService()
    {
        var credentials = new Mock<ICredentialService>(MockBehavior.Strict);
        var controller = CreateController(credentials.Object, "not-an-integer");

        var result = await controller.ChangePassword(new ChangePasswordDTO(), CancellationToken.None);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public void ChangePassword_RequiresDedicatedAuthorizationPolicy()
    {
        var method = typeof(AuthController).GetMethod(nameof(AuthController.ChangePassword));

        var authorize = Assert.Single(method!.GetCustomAttributes(typeof(AuthorizeAttribute), true)
            .Cast<AuthorizeAttribute>());
        Assert.Equal(CredentialAuthorizationPolicies.ChangeOwnPassword, authorize.Policy);
    }

    private static AuthController CreateController(ICredentialService credentials, string subject)
    {
        var controller = new AuthController(
            CreateJwtService(),
            Mock.Of<IUnitOfWork>(),
            credentials);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    [new Claim(ClaimTypes.NameIdentifier, subject)],
                    "test"))
            }
        };
        return controller;
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
}
