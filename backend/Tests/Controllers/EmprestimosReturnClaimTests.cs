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
}
