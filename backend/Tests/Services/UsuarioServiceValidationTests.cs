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
    public void ValidarEstrutura_DoesNotApplyAcademicCityAndCourseRulesToCommonUser()
    {
        var request = CreateAcademicRequest(city: "Indefinido", course: "E");
        request.TipoUsuario = "Comum";
        request.NivelUsuario = "Comum";

        var result = CreateService().ValidarEstrutura(request);

        Assert.True(result.Validado);
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
