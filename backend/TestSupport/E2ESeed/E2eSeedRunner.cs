using System.Text.Json;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace E2ESeed;

public static class E2eSeedRunner
{
    public static async Task<int> RunAsync(
        IReadOnlyList<string> args,
        IReadOnlyDictionary<string, string?> environment,
        CancellationToken cancellationToken = default)
    {
        var options = SeedOptions.Parse(args, environment);
        if (options.IsHelp)
        {
            Console.WriteLine("Uso: E2E_SEED_*=<valores sintéticos> dotnet E2ESeed.dll --scenario <identificador>");
            Console.WriteLine("Prepara administrador, mentor, mentorado e produto isolados no banco E2E permitido.");
            return 0;
        }

        var identity = ScenarioIdentity.FromScenario(options.Scenario);
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(options.ConnectionString)
            .Options;

        await using var context = new AppDbContext(dbOptions);
        if (!await context.Database.CanConnectAsync(cancellationToken))
        {
            throw new InvalidOperationException("Não foi possível conectar ao banco sintético.");
        }

        var hasher = new PasswordHasher<Usuario>();
        await UpsertUsersAsync(context, identity, options.Credentials, hasher, cancellationToken);
        await UpsertProductAsync(context, identity, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        Console.WriteLine(JsonSerializer.Serialize(new
        {
            scenario = identity.Scenario,
            token = identity.Token,
            administrator = new { id = identity.AdministratorId, email = options.Credentials.AdminEmail },
            mentor = new { id = identity.MentorId, email = options.Credentials.MentorEmail },
            borrower = new { id = identity.BorrowerId, email = options.Credentials.BorrowerEmail },
            product = new { id = identity.ProductId, name = $"E2E Product {identity.Token}" }
        }));
        return 0;
    }

    private static async Task UpsertUsersAsync(
        AppDbContext context,
        ScenarioIdentity identity,
        SeedCredentials credentials,
        IPasswordHasher<Usuario> hasher,
        CancellationToken cancellationToken)
    {
        var administrator = await GetOrCreateAsync<Administrador>(context, identity.AdministratorId, credentials.AdminEmail,
            () => new Administrador { Id = identity.AdministratorId, NomeCompleto = $"E2E Administrator {identity.Token}", Email = credentials.AdminEmail, SenhaHash = string.Empty }, cancellationToken);
        SetCommonUserValues(administrator, credentials.AdminEmail, NivelUsuario.Administrador, TipoUsuario.Administrador, hasher, credentials.AdminPassword);

        var mentor = await GetOrCreateAsync<Academico>(context, identity.MentorId, credentials.MentorEmail,
            () => new Academico { Id = identity.MentorId, NomeCompleto = $"E2E Mentor {identity.Token}", Email = credentials.MentorEmail, SenhaHash = string.Empty, Instituicao = $"E2E Institution {identity.Token}" }, cancellationToken);
        SetCommonUserValues(mentor, credentials.MentorEmail, NivelUsuario.Mentor, TipoUsuario.Academico, hasher, credentials.MentorPassword);
        mentor.Instituicao = $"E2E Institution {identity.Token}";
        mentor.Cidade = "Recife";
        mentor.Curso = "Química";

        var borrower = await GetOrCreateAsync<Academico>(context, identity.BorrowerId, credentials.BorrowerEmail,
            () => new Academico { Id = identity.BorrowerId, NomeCompleto = $"E2E Borrower {identity.Token}", Email = credentials.BorrowerEmail, SenhaHash = string.Empty, Instituicao = $"E2E Institution {identity.Token}" }, cancellationToken);
        SetCommonUserValues(borrower, credentials.BorrowerEmail, NivelUsuario.Mentorado, TipoUsuario.Academico, hasher, credentials.BorrowerPassword);
        borrower.ResponsavelId = identity.MentorId;
        borrower.Instituicao = $"E2E Institution {identity.Token}";
        borrower.Cidade = "Recife";
        borrower.Curso = "Química";
    }

    private static async Task<T> GetOrCreateAsync<T>(
        AppDbContext context,
        int id,
        string expectedEmail,
        Func<T> factory,
        CancellationToken cancellationToken)
        where T : Usuario
    {
        var existing = await context.Usuarios.SingleOrDefaultAsync(user => user.Id == id, cancellationToken);
        if (existing is null)
        {
            var created = factory();
            switch (created)
            {
                case Administrador administrator:
                    context.Administradores.Add(administrator);
                    break;
                case Academico academic:
                    context.Academicos.Add(academic);
                    break;
                default:
                    throw new InvalidOperationException("Tipo de usuário E2E não permitido.");
            }

            return created;
        }

        if (existing is not T typed || !string.Equals(existing.Email, expectedEmail, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("O identificador determinístico já pertence a outro registro.");
        }

        return typed;
    }

    private static void SetCommonUserValues(
        Usuario user,
        string email,
        NivelUsuario level,
        TipoUsuario type,
        IPasswordHasher<Usuario> hasher,
        string password)
    {
        user.Email = email;
        user.SenhaHash = hasher.HashPassword(user, password);
        user.NivelUsuario = level;
        user.TipoUsuario = type;
        user.Status = StatusUsuario.Habilitado;
        user.ExigeTrocaSenha = false;
        user.VersaoSessao = 0;
    }

    private static async Task UpsertProductAsync(
        AppDbContext context,
        ScenarioIdentity identity,
        CancellationToken cancellationToken)
    {
        var name = $"E2E Product {identity.Token}";
        var product = await context.Produtos.SingleOrDefaultAsync(item => item.Id == identity.ProductId, cancellationToken);
        if (product is null)
        {
            context.Produtos.Add(new Produto
            {
                Id = identity.ProductId,
                NomeProduto = name,
                Catmat = $"E2E-CATMAT-{identity.Token}",
                Fornecedor = "E2E Synthetic Supplier",
                Tipo = TipoProduto.Outro,
                Quantidade = 100,
                QuantidadeMinima = 10,
                UnidadeMedida = UnidadeMedida.Unidade,
                Status = StatusProduto.Disponivel,
                UltimaModificacao = DateTime.UtcNow
            });
            return;
        }

        if (!string.Equals(product.NomeProduto, name, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("O identificador determinístico do produto já pertence a outro registro.");
        }

        product.Quantidade = 100;
        product.QuantidadeMinima = 10;
        product.Status = StatusProduto.Disponivel;
        product.UltimaModificacao = DateTime.UtcNow;
    }
}
