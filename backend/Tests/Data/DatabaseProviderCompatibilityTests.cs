using LabSolos_Server_DotNet8.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Tests.Data;

public class DatabaseProviderCompatibilityTests
{
    [Fact]
    public void AppDbContext_DeveSelecionarProvedorNpgsql()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=lab_solos;Username=test;Password=test")
            .Options;

        using var context = new AppDbContext(options);

        Assert.Equal("Npgsql.EntityFrameworkCore.PostgreSQL", context.Database.ProviderName);
    }
}
