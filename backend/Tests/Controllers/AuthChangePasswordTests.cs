using System.Security.Claims;
using System.Text.Json;
using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.DTOs.Auth;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
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
        var passwordChanges = new Mock<IPasswordChangeRateLimitService>();
        passwordChanges.Setup(service => service.ChangePasswordAsync(
                42,
                It.Is<ChangePasswordDTO>(request =>
                    request.CurrentPassword == "current-password"
                    && request.NewPassword == "valid-new-password"
                    && request.Confirmation == "valid-new-password"),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(CredentialChangeResult.Success());
        var controller = CreateController(passwordChanges.Object, "42");

        var result = await controller.ChangePassword(new ChangePasswordDTO
        {
            CurrentPassword = "current-password",
            NewPassword = "valid-new-password",
            Confirmation = "valid-new-password"
        }, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        Assert.Equal("no-store", controller.Response.Headers.CacheControl);
        Assert.Equal("no-cache", controller.Response.Headers.Pragma);
        passwordChanges.VerifyAll();
    }

    [Theory]
    [InlineData("current_password_invalid", "currentPassword", "A senha atual informada é inválida.")]
    [InlineData("password_confirmation_mismatch", "confirmation", "A confirmação da nova senha não confere.")]
    [InlineData("password_common", "newPassword", "A nova senha é muito comum.")]
    [InlineData("password_required", "newPassword", "A nova senha é obrigatória.")]
    [InlineData("password_too_short", "newPassword", "A nova senha deve ter pelo menos 15 caracteres.")]
    [InlineData("password_too_long", "newPassword", "A nova senha deve ter no máximo 128 caracteres.")]
    public async Task ChangePassword_ValidationFailure_ReturnsStableProblemDetails(
        string code,
        string expectedField,
        string expectedMessage)
    {
        var passwordChanges = new Mock<IPasswordChangeRateLimitService>();
        passwordChanges.Setup(service => service.ChangePasswordAsync(
                42,
                It.IsAny<ChangePasswordDTO>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(CredentialChangeResult.ValidationFailed(code));
        var controller = CreateController(passwordChanges.Object, "42");

        var result = await controller.ChangePassword(new ChangePasswordDTO(), CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, objectResult.StatusCode);
        var details = Assert.IsType<ValidationProblemDetails>(objectResult.Value);
        Assert.Equal("https://httpstatuses.com/400", details.Type);
        Assert.Contains(details.Errors[expectedField], value => value == code);
        Assert.Contains(details.Errors[expectedField], value => value == expectedMessage);
        var serialized = JsonSerializer.Serialize(objectResult.Value);
        Assert.DoesNotContain("current-password", serialized);
        Assert.DoesNotContain("valid-new-password", serialized);
        Assert.DoesNotContain("hash", serialized, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("jwt", serialized, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UsesSafeValidationDefaultsForNullRequestAndMissingCode()
    {
        var passwordChanges = new Mock<IPasswordChangeRateLimitService>();
        passwordChanges.Setup(service => service.ChangePasswordAsync(
                42,
                It.Is<ChangePasswordDTO>(request =>
                    request.CurrentPassword == null
                    && request.NewPassword == null
                    && request.Confirmation == null),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CredentialChangeResult(CredentialChangeStatus.ValidationFailed, null));
        var controller = CreateController(passwordChanges.Object, "42");

        var result = await controller.ChangePassword(null, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, objectResult.StatusCode);
        var details = Assert.IsType<ValidationProblemDetails>(objectResult.Value);
        Assert.Contains("password_invalid", details.Errors["newPassword"]);
        passwordChanges.VerifyAll();
    }

    [Fact]
    public async Task ChangePassword_ConcurrencyFailure_ReturnsConflictProblemDetails()
    {
        var passwordChanges = new Mock<IPasswordChangeRateLimitService>();
        passwordChanges.Setup(service => service.ChangePasswordAsync(
                42,
                It.IsAny<ChangePasswordDTO>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(CredentialChangeResult.Conflict());
        var controller = CreateController(passwordChanges.Object, "42");

        var result = await controller.ChangePassword(new ChangePasswordDTO(), CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, objectResult.StatusCode);
        var details = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal("credential_concurrency_conflict", details.Extensions["code"]);
    }

    [Fact]
    public async Task ChangePasswordRateLimitedReturnsRetryAfterProblemDetails()
    {
        var passwordChanges = new Mock<IPasswordChangeRateLimitService>();
        passwordChanges.Setup(service => service.ChangePasswordAsync(
                42,
                It.IsAny<ChangePasswordDTO>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(CredentialChangeResult.RateLimited(17));
        var controller = CreateController(passwordChanges.Object, "42");

        var result = await controller.ChangePassword(new ChangePasswordDTO(), CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status429TooManyRequests, objectResult.StatusCode);
        var details = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal("authentication_rate_limited", details.Extensions["code"]);
        Assert.Equal(17, details.Extensions["retryAfterSeconds"]);
        Assert.Equal("17", controller.Response.Headers.RetryAfter);
        Assert.Equal("no-store", controller.Response.Headers.CacheControl);
    }

    [Fact]
    public async Task ChangePasswordLimiterUnavailableReturnsTransientServiceUnavailable()
    {
        var passwordChanges = new Mock<IPasswordChangeRateLimitService>();
        passwordChanges.Setup(service => service.ChangePasswordAsync(
                42,
                It.IsAny<ChangePasswordDTO>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(CredentialChangeResult.Unavailable());
        var controller = CreateController(passwordChanges.Object, "42");

        var result = await controller.ChangePassword(new ChangePasswordDTO(), CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, objectResult.StatusCode);
        var details = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal("authentication_protection_unavailable", details.Extensions["code"]);
        Assert.Equal("no-store", controller.Response.Headers.CacheControl);
    }

    [Fact]
    public async Task ChangePassword_MissingOrMalformedSubject_ReturnsUnauthorizedWithoutCallingService()
    {
        var passwordChanges = new Mock<IPasswordChangeRateLimitService>(MockBehavior.Strict);
        var controller = CreateController(passwordChanges.Object, "not-an-integer");

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

    private static AuthController CreateController(IPasswordChangeRateLimitService passwordChanges, string subject)
    {
        var controller = new AuthController(
            CreateJwtService(),
            Mock.Of<IUnitOfWork>(),
            passwordChanges,
            new PasswordHasher<Usuario>(),
            Options.Create(new AuthenticationProtectionOptions()),
            Mock.Of<ISecretFileReader>(),
            Mock.Of<IHostEnvironment>(),
            new AuthenticationProtectionTelemetry(NullLogger<AuthenticationProtectionTelemetry>.Instance));
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
