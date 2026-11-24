using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Tests.Services;

public class UsuarioServiceValidationTests
{
    [Theory]
    [InlineData("Mentor", "Academico", true)]
    [InlineData("Mentorado", "Academico", true)]
    [InlineData("Administrador", "Academico", false)]
    [InlineData("Mentor", "Comum", false)]
    [InlineData("1", "1", false)]
    public void PublicPolicyAllowsOnlyNamedAcademicModalities(string role, string type, bool expected)
    {
        var request = CreateAcademicRequest();
        request.NivelUsuario = role;
        request.TipoUsuario = type;
        Assert.Equal(expected, PoliticaContas.TryGetPublicRole(request, out var effective));
        if (expected)
            Assert.Equal(role, effective.ToString());
    }

    [Theory]
    [InlineData(NivelUsuario.Administrador, true, true, true)]
    [InlineData(NivelUsuario.Mentor, true, true, true)]
    [InlineData(NivelUsuario.Mentor, true, false, false)]
    [InlineData(NivelUsuario.Mentor, false, true, false)]
    [InlineData(NivelUsuario.Mentorado, true, true, false)]
    public void DecisionPolicyChecksRoleEnabledStateAndCurrentLink(
        NivelUsuario actorRole, bool enabled, bool linked, bool expected)
    {
        var actor = new Usuario
        {
            Id = 10, NomeCompleto = "Ator sintético", Email = "actor@example.test", SenhaHash = "synthetic",
            NivelUsuario = actorRole,
            Status = enabled ? StatusUsuario.Habilitado : StatusUsuario.Desabilitado
        };
        var candidate = new Usuario
        {
            NomeCompleto = "Candidato sintético", Email = "candidate@example.test", SenhaHash = "synthetic",
            TipoUsuario = TipoUsuario.Academico,
            NivelUsuario = NivelUsuario.Mentorado,
            Status = StatusUsuario.Pendente,
            ResponsavelId = linked ? actor.Id : 11
        };
        Assert.Equal(expected, PoliticaContas.CanDecide(actor, candidate));
        candidate.Status = StatusUsuario.Habilitado;
        Assert.False(PoliticaContas.CanDecide(actor, candidate));
    }

    public static TheoryData<string?> InvalidCities => new()
    {
        null,
        string.Empty,
        "   ",
        "Indefinido",
        " indefinido ",
        "INDEFINIDO"
    };

    public static TheoryData<string> InvalidCourses => new()
    {
        "E",
        $" {new string('C', 101)} "
    };

    [Theory]
    [MemberData(nameof(InvalidCities))]
    public void ValidarEstrutura_RejectsInvalidAcademicCity(string? city)
    {
        var request = CreateAcademicRequest(city: city);

        var result = CreateService().ValidarEstrutura(request);

        Assert.False(result.Validado);
        Assert.Equal(["Informe uma cidade válida."], result.Errors["cidade"]);
    }

    [Theory]
    [MemberData(nameof(InvalidCourses))]
    public void ValidarEstrutura_RejectsAcademicCourseOutsideLengthLimits(string course)
    {
        var request = CreateAcademicRequest(course: course);

        var result = CreateService().ValidarEstrutura(request);

        Assert.False(result.Validado);
        Assert.Equal(["O curso deve ter entre 2 e 100 caracteres."], result.Errors["curso"]);
    }

    [Theory]
    [InlineData(" ES ", "ES")]
    [InlineData(" CC ", "CC")]
    public void ValidarEstrutura_AcceptsAndNormalizesAcademicCourseAtMinimumLength(
        string course,
        string expectedCourse)
    {
        var request = CreateAcademicRequest(city: " Belo Jardim ", course: course);

        var result = CreateService().ValidarEstrutura(request);

        Assert.True(result.Validado);
        Assert.Equal("Belo Jardim", request.Cidade);
        Assert.Equal(expectedCourse, request.Curso);
    }

    [Fact]
    public void ValidarEstrutura_AcceptsAcademicCourseAtMaximumLengthAfterTrim()
    {
        var expectedCourse = new string('C', 100);
        var request = CreateAcademicRequest(course: $" {expectedCourse} ");

        var result = CreateService().ValidarEstrutura(request);

        Assert.True(result.Validado);
        Assert.Equal(expectedCourse, request.Curso);
    }

    [Fact]
    public void ValidarEstrutura_RejectsCommonUserFromPublicRegistration()
    {
        var request = CreateAcademicRequest(city: "Indefinido", course: "E");
        request.TipoUsuario = "Comum";
        request.NivelUsuario = "Comum";

        var result = CreateService().ValidarEstrutura(request);

        Assert.False(result.Validado);
    }

    private static UsuarioService CreateService() => new(
        NullLogger<UsuarioService>.Instance,
        new PasswordPolicy([]),
        Mock.Of<IPasswordHasher<Usuario>>());

    private static AddUsuarioDTO CreateAcademicRequest(
        string? city = "Belo Jardim",
        string? course = "ES") => new()
    {
        NomeCompleto = "Pessoa de teste",
        Email = "pessoa@example.test",
        Senha = "safe registration password",
        NivelUsuario = "Mentor",
        TipoUsuario = "Academico",
        Instituicao = "IFPE",
        Cidade = city,
        Curso = course
    };
}
