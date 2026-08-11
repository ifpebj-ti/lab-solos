using AutoMapper;
using Core.DTOs.Mappings;
using Microsoft.Extensions.Logging.Abstractions;

namespace Tests.Mappings;

public class MappingConfigurationTests
{
    [Fact]
    public void TodosOsPerfisDoAssembly_DevemTerConfiguracaoValida()
    {
        var mappingsAssembly = typeof(ProdutoMappingProfile).Assembly;
        var profileTypes = mappingsAssembly
            .GetTypes()
            .Where(type => !type.IsAbstract && typeof(Profile).IsAssignableFrom(type))
            .ToArray();

        Assert.NotEmpty(profileTypes);

        var configuration = new MapperConfiguration(
            config => config.AddMaps(mappingsAssembly),
            NullLoggerFactory.Instance);

        configuration.AssertConfigurationIsValid();
    }
}
