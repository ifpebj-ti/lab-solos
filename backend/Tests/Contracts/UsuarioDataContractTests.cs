using System.Text.Json;
using AutoMapper;
using Core.DTOs.Mappings;
using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.DependencyInjection;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Tests.Contracts;

public class UsuarioDataContractTests
{
    private static readonly JsonSerializerOptions WebJson = new(JsonSerializerDefaults.Web);

    public static TheoryData<Type> UserContractTypes => new()
    {
        typeof(Usuario),
        typeof(UsuarioDTO),
        typeof(AcademicoDTO),
        typeof(ResponsavelDTO),
        typeof(DependenteDTO),
        typeof(UsuarioDTOPatchResponse)
    };

    [Theory]
    [MemberData(nameof(UserContractTypes))]
    public void DataIngresso_IsOptionalCivilDateAcrossUserContracts(Type contractType)
    {
        var property = contractType.GetProperty(nameof(Usuario.DataIngresso));
        Assert.NotNull(property);

        Assert.Equal(typeof(DateOnly?), property!.PropertyType);
    }

    [Theory]
    [InlineData(typeof(UsuarioDTO))]
    [InlineData(typeof(AcademicoDTO))]
    [InlineData(typeof(ResponsavelDTO))]
    [InlineData(typeof(DependenteDTO))]
    [InlineData(typeof(UsuarioDTOPatchResponse))]
    public void DataIngresso_SerializesAsIsoCivilDateOrNull(Type dtoType)
    {
        var datedDto = CreateDto(dtoType, new DateOnly(2026, 8, 31));
        var nullDto = CreateDto(dtoType, null);

        var datedJson = JsonSerializer.Serialize(datedDto, dtoType, WebJson);
        var nullJson = JsonSerializer.Serialize(nullDto, dtoType, WebJson);
        var newtonsoftDatedJson = Newtonsoft.Json.JsonConvert.SerializeObject(datedDto);
        var newtonsoftNullJson = Newtonsoft.Json.JsonConvert.SerializeObject(nullDto);

        Assert.Contains("\"dataIngresso\":\"2026-08-31\"", datedJson);
        Assert.DoesNotContain("T00:00:00", datedJson);
        Assert.Contains("\"dataIngresso\":null", nullJson);
        Assert.Contains("\"DataIngresso\":\"2026-08-31\"", newtonsoftDatedJson);
        Assert.DoesNotContain("T00:00:00", newtonsoftDatedJson);
        Assert.Contains("\"DataIngresso\":null", newtonsoftNullJson);
    }

    [Fact]
    public void UsuarioMappings_PreserveCivilDateNullabilityAndEnumNames()
    {
        var configuration = new MapperConfiguration(
            config => config.AddProfile<UsuarioMappingProfile>(),
            NullLoggerFactory.Instance);
        var mapper = configuration.CreateMapper();
        var source = new Academico
        {
            NomeCompleto = "Pessoa de teste",
            Email = "pessoa@example.test",
            SenhaHash = "hash",
            DataIngresso = new DateOnly(2026, 8, 31),
            NivelUsuario = NivelUsuario.Mentor,
            TipoUsuario = TipoUsuario.Academico,
            Status = StatusUsuario.Habilitado,
            Instituicao = "IFPE",
            Cidade = null,
            Curso = null
        };

        var user = mapper.Map<UsuarioDTO>(source);
        var academic = mapper.Map<AcademicoDTO>(source);
        var responsible = mapper.Map<ResponsavelDTO>(source);
        var dependent = mapper.Map<DependenteDTO>(source);
        var patch = mapper.Map<UsuarioDTOPatchResponse>(source);

        foreach (var dto in new object[] { user, academic, responsible, dependent, patch })
        {
            Assert.Equal(new DateOnly(2026, 8, 31), ReadCivilDate(dto));
            Assert.Equal(StatusUsuario.Habilitado.ToString(), ReadString(dto, "Status"));
            Assert.Equal(NivelUsuario.Mentor.ToString(), ReadString(dto, "NivelUsuario"));
        }

        Assert.Equal(TipoUsuario.Academico.ToString(), user.TipoUsuario);
        Assert.Equal(TipoUsuario.Academico.ToString(), patch.TipoUsuario);
        Assert.Null(academic.Cidade);
        Assert.Null(responsible.Curso);
        Assert.Null(dependent.Cidade);
    }

    [Fact]
    public void UsuariosController_ReceivesApplicationTimeProvider()
    {
        var constructor = Assert.Single(typeof(UsuariosController).GetConstructors());

        Assert.Contains(
            constructor.GetParameters(),
            parameter => parameter.ParameterType == typeof(TimeProvider));
    }

    [Theory]
    [InlineData(typeof(UsuarioDTO))]
    [InlineData(typeof(AcademicoDTO))]
    [InlineData(typeof(ResponsavelDTO))]
    [InlineData(typeof(DependenteDTO))]
    [InlineData(typeof(UsuarioDTOPatchResponse))]
    public void OpenApi_DescribesDataIngressoAsNullableDateString(Type dtoType)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddMvcCore().AddApiExplorer();
        services.AddSwaggerGen();
        using var provider = services.BuildServiceProvider();
        var generator = provider.GetRequiredService<ISchemaGenerator>();
        var repository = new SchemaRepository();

        generator.GenerateSchema(dtoType, repository);

        var userSchema = repository.Schemas[dtoType.Name];
        Assert.NotNull(userSchema.Properties);
        var dateSchema = userSchema.Properties!["dataIngresso"];
        var typeDescription = dateSchema.Type?.ToString() ?? string.Empty;
        Assert.Equal("date", dateSchema.Format);
        Assert.Contains("String", typeDescription);
        Assert.Contains("Null", typeDescription);
    }

    private static object CreateDto(Type dtoType, DateOnly? date)
    {
        var dto = Activator.CreateInstance(dtoType)!;
        var property = dtoType.GetProperty(nameof(Usuario.DataIngresso))!;
        property.SetValue(dto, date);
        return dto;
    }

    private static DateOnly? ReadCivilDate(object dto)
    {
        var value = dto.GetType().GetProperty(nameof(Usuario.DataIngresso))!.GetValue(dto);
        return value as DateOnly?;
    }

    private static string? ReadString(object dto, string propertyName) =>
        dto.GetType().GetProperty(propertyName)!.GetValue(dto) as string;
}
