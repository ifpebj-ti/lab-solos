using System.Security.Cryptography;
using System.Text;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;

namespace Tests.Infrastructure;

public sealed record CriticalScenarioData
{
    private const int IdBlockMultiplier = 10;
    private const int IdBlockOffset = 10_000;
    private const int IdBlockModulo = 80_000;

    public const int LoanQuantity = 2;

    private CriticalScenarioData(
        string scenarioKey,
        string scenarioToken,
        bool includeAdministrator,
        int administratorId,
        int responsibleId,
        int borrowerId,
        int productId,
        int loanId)
    {
        ScenarioKey = scenarioKey;
        ScenarioToken = scenarioToken;
        IncludesAdministrator = includeAdministrator;
        AdministratorId = administratorId;
        ResponsibleId = responsibleId;
        BorrowerId = borrowerId;
        ProductId = productId;
        LoanId = loanId;
        AdministratorEmail = $"admin-{scenarioToken}@integration.test";
        ResponsibleEmail = $"mentor-{scenarioToken}@integration.test";
        BorrowerEmail = $"borrower-{scenarioToken}@integration.test";
        AdministratorPassword = $"T010-Admin-{scenarioToken}-Secure!";
        ResponsiblePassword = $"T010-Mentor-{scenarioToken}-Secure!";
        BorrowerPassword = $"T010-Borrower-{scenarioToken}-Secure!";
    }

    public string ScenarioKey { get; }

    public string ScenarioToken { get; }

    public bool IncludesAdministrator { get; }

    public int AdministratorId { get; }

    public int ResponsibleId { get; }

    public int BorrowerId { get; }

    public int ProductId { get; }

    public int LoanId { get; }

    public string AdministratorEmail { get; }

    public string ResponsibleEmail { get; }

    public string BorrowerEmail { get; }

    public string AdministratorPassword { get; }

    public string ResponsiblePassword { get; }

    public string BorrowerPassword { get; }

    public static CriticalScenarioData Create(string scenarioKey, bool includeAdministrator = true)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(scenarioKey);

        var normalizedKey = scenarioKey.Trim();
        var digest = SHA256.HashData(Encoding.UTF8.GetBytes(normalizedKey));
        var scenarioToken = Convert.ToHexString(digest)[..12].ToLowerInvariant();
        var block = IdBlockOffset +
            (BitConverter.ToUInt32(digest, 0) % IdBlockModulo) * IdBlockMultiplier;

        return new CriticalScenarioData(
            normalizedKey,
            scenarioToken,
            includeAdministrator,
            checked((int)block + 1),
            checked((int)block + 2),
            checked((int)block + 3),
            checked((int)block + 4),
            checked((int)block + 5));
    }

    public async Task PersistAsync(
        AppDbContext context,
        IPasswordHasher<Usuario> passwordHasher,
        TimeProvider timeProvider,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(passwordHasher);
        ArgumentNullException.ThrowIfNull(timeProvider);

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var borrower = CreateBorrower(passwordHasher);
        var product = new Produto
        {
            Id = ProductId,
            NomeProduto = $"Produto {ScenarioToken}",
            Catmat = $"CATMAT-{ScenarioToken}",
            Fornecedor = "Fornecedor sintético T010",
            Tipo = TipoProduto.Outro,
            Quantidade = 10,
            QuantidadeMinima = 2,
            UnidadeMedida = UnidadeMedida.Unidade,
            Status = StatusProduto.Disponivel,
            UltimaModificacao = now
        };
        var loan = new Emprestimo
        {
            Id = LoanId,
            DataRealizacao = now,
            DataPrevistaDevolucao = now.AddDays(7),
            DataDevolucao = null,
            Status = StatusEmprestimo.Pendente,
            SolicitanteId = BorrowerId,
            Produtos =
            [
                new ProdutoEmprestado
                {
                    EmprestimoId = LoanId,
                    Emprestimo = null!,
                    ProdutoId = ProductId,
                    Produto = product,
                    Quantidade = LoanQuantity
                }
            ]
        };

        if (IncludesAdministrator)
        {
            var administrator = CreateAdministrator(passwordHasher);
            var responsible = CreateResponsible(passwordHasher);
            borrower.ResponsavelId = responsible.Id;

            context.Administradores.Add(administrator);
            context.Academicos.AddRange(responsible, borrower);
        }
        else
        {
            context.Usuarios.Add(borrower);
        }

        context.Produtos.Add(product);
        context.Emprestimos.Add(loan);
        await context.SaveChangesAsync(cancellationToken);
    }

    private Administrador CreateAdministrator(IPasswordHasher<Usuario> passwordHasher)
    {
        var administrator = new Administrador
        {
            Id = AdministratorId,
            NomeCompleto = $"Administrador {ScenarioToken}",
            Email = AdministratorEmail,
            SenhaHash = string.Empty,
            NivelUsuario = NivelUsuario.Administrador,
            TipoUsuario = TipoUsuario.Administrador,
            Status = StatusUsuario.Habilitado,
            ExigeTrocaSenha = false,
            VersaoSessao = 0
        };
        administrator.SenhaHash = passwordHasher.HashPassword(administrator, AdministratorPassword);
        return administrator;
    }

    private Academico CreateResponsible(IPasswordHasher<Usuario> passwordHasher)
    {
        var responsible = new Academico
        {
            Id = ResponsibleId,
            NomeCompleto = $"Mentor {ScenarioToken}",
            Email = ResponsibleEmail,
            SenhaHash = string.Empty,
            NivelUsuario = NivelUsuario.Mentor,
            TipoUsuario = TipoUsuario.Academico,
            Status = StatusUsuario.Habilitado,
            ExigeTrocaSenha = false,
            VersaoSessao = 0,
            Instituicao = $"Instituição {ScenarioToken}",
            Cidade = "Recife",
            Curso = "Química"
        };
        responsible.SenhaHash = passwordHasher.HashPassword(responsible, ResponsiblePassword);
        return responsible;
    }

    private Academico CreateBorrower(IPasswordHasher<Usuario> passwordHasher)
    {
        var borrower = new Academico
        {
            Id = BorrowerId,
            NomeCompleto = $"Mentorado {ScenarioToken}",
            Email = BorrowerEmail,
            SenhaHash = string.Empty,
            NivelUsuario = IncludesAdministrator ? NivelUsuario.Mentorado : NivelUsuario.Comum,
            TipoUsuario = TipoUsuario.Academico,
            Status = StatusUsuario.Habilitado,
            ExigeTrocaSenha = false,
            VersaoSessao = 0,
            Instituicao = $"Instituição {ScenarioToken}",
            Cidade = "Recife",
            Curso = "Química"
        };

        borrower.SenhaHash = passwordHasher.HashPassword(borrower, BorrowerPassword);
        return borrower;
    }
}
