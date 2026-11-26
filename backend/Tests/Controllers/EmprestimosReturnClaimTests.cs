using System.Security.Claims;
using AutoMapper;
using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace Tests.Controllers;

public sealed class EmprestimosReturnClaimTests
{
    [Fact]
    public async Task LoanDecisionRejectsUnauthenticatedPrincipalBeforeCallingService()
    {
        var decisionService = new Mock<ILoanDecisionService>(MockBehavior.Strict);
        var controller = CreateDecisionController(new ClaimsPrincipal(new ClaimsIdentity()));

        var result = await controller.AprovarEmprestimo(17, decisionService.Object);

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal("Usuário não autenticado.", unauthorized.Value);
        decisionService.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("not-an-integer")]
    [InlineData("2147483648")]
    public async Task LoanDecisionRejectsMissingOrMalformedSubject(string? subject)
    {
        var decisionService = new Mock<ILoanDecisionService>(MockBehavior.Strict);
        var controller = CreateDecisionController(CreatePrincipal(subject, NivelUsuario.Administrador));

        var result = await controller.AprovarEmprestimo(17, decisionService.Object);

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal("Token inválido. ID do usuário não encontrado.", unauthorized.Value);
        decisionService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task LoanDecisionRejectsNonAdministratorBeforeCallingService()
    {
        var decisionService = new Mock<ILoanDecisionService>(MockBehavior.Strict);
        var controller = CreateDecisionController(CreatePrincipal("42", NivelUsuario.Comum));

        var result = await controller.AprovarEmprestimo(17, decisionService.Object);

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal("Apenas administradores podem decidir empréstimos.", unauthorized.Value);
        decisionService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task AuthorizedLoanDecisionReturnsNoContentAndForwardsActor()
    {
        var decisionService = new Mock<ILoanDecisionService>(MockBehavior.Strict);
        decisionService
            .Setup(service => service.DecideAsync(17, 42, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(LoanDecisionResult.Success());
        var controller = CreateDecisionController(CreatePrincipal("42", NivelUsuario.Administrador));

        var result = await controller.AprovarEmprestimo(17, decisionService.Object);

        Assert.IsType<NoContentResult>(result);
        decisionService.Verify(service => service.DecideAsync(
            17, 42, true, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(true, null, 404)]
    [InlineData(false, "loan_not_approved_for_return", 409)]
    public async Task AuthorizedLoanDecisionMapsDomainOutcomes(
        bool loanNotFound,
        string? conflictCode,
        int expectedStatus)
    {
        var decisionService = new Mock<ILoanDecisionService>(MockBehavior.Strict);
        decisionService
            .Setup(service => service.DecideAsync(17, 42, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LoanDecisionResult(false, loanNotFound, conflictCode));
        var controller = CreateDecisionController(CreatePrincipal("42", NivelUsuario.Administrador));

        var result = await controller.ReprovarEmprestimo(17, decisionService.Object);

        Assert.Equal(expectedStatus, (result as ObjectResult)?.StatusCode);
        if (expectedStatus == StatusCodes.Status409Conflict)
        {
            var details = Assert.IsType<ProblemDetails>(Assert.IsType<ConflictObjectResult>(result).Value);
            Assert.Equal(conflictCode, details.Extensions["code"]);
        }
        decisionService.Verify(service => service.DecideAsync(
            17, 42, false, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData("not-an-integer")]
    [InlineData("2147483648")]
    public async Task ReturnRejectsMalformedSubjectBeforeAccessingTheRepository(string subject)
    {
        var unitOfWork = new Mock<IUnitOfWork>(MockBehavior.Strict);
        var controller = new EmprestimosController(
            unitOfWork.Object,
            Mock.Of<IMapper>(),
            Mock.Of<INotificacaoService>(),
            TimeProvider.System)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(ClaimTypes.NameIdentifier, subject),
                        new Claim(ClaimTypes.Role, NivelUsuario.Administrador.ToString())
                    ], "synthetic-test"))
                }
            }
        };

        var result = await controller.DevolverEmprestimo(17);

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal(StatusCodes.Status401Unauthorized, unauthorized.StatusCode);
        Assert.Equal("Token inválido. ID do usuário não encontrado.", unauthorized.Value);
        unitOfWork.VerifyNoOtherCalls();
    }

    private static EmprestimosController CreateDecisionController(ClaimsPrincipal user) =>
        new(
            Mock.Of<IUnitOfWork>(),
            Mock.Of<IMapper>(),
            Mock.Of<INotificacaoService>(),
            TimeProvider.System)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            }
        };

    private static ClaimsPrincipal CreatePrincipal(string? subject, NivelUsuario role)
    {
        var claims = new List<Claim> { new(ClaimTypes.Role, role.ToString()) };
        if (subject is not null)
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, subject));
        }
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "synthetic-test"));
    }
}
