using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.Identity;

namespace Tests.Infrastructure;

public sealed record AuthenticationProtectionScenarioData
{
    private AuthenticationProtectionScenarioData(string key, string token, int firstId)
    {
        ScenarioKey = key;
        ScenarioToken = token;
        AdministratorId = firstId;
        MentorOneId = firstId + 1;
        MentorTwoId = firstId + 2;
        MenteeOneId = firstId + 3;
        MenteeTwoId = firstId + 4;

        AdministratorEmail = $"administrator-{token}@integration.test";
        MentorOneEmail = $"mentor-one-{token}@integration.test";
        MentorTwoEmail = $"mentor-two-{token}@integration.test";
        MenteeOneEmail = $"mentee-one-{token}@integration.test";
        MenteeTwoEmail = $"mentee-two-{token}@integration.test";

        AdministratorPassword = $"T001-Admin-{token}-Synthetic!";
        MentorOnePassword = $"T001-MentorOne-{token}-Synthetic!";
        MentorTwoPassword = $"T001-MentorTwo-{token}-Synthetic!";
        MenteeOnePassword = $"T001-MenteeOne-{token}-Synthetic!";
        MenteeTwoPassword = $"T001-MenteeTwo-{token}-Synthetic!";
    }

    public string ScenarioKey { get; }

    public string ScenarioToken { get; }

    public int AdministratorId { get; }

    public int MentorOneId { get; }

    public int MentorTwoId { get; }

    public int MenteeOneId { get; }

    public int MenteeTwoId { get; }

    public string AdministratorEmail { get; }

    public string MentorOneEmail { get; }

    public string MentorTwoEmail { get; }

    public string MenteeOneEmail { get; }

    public string MenteeTwoEmail { get; }

    public string AdministratorPassword { get; }

    public string MentorOnePassword { get; }

    public string MentorTwoPassword { get; }

    public string MenteeOnePassword { get; }

    public string MenteeTwoPassword { get; }

    public static AuthenticationProtectionScenarioData Create(string scenarioKey)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(scenarioKey);

        var normalizedKey = scenarioKey.Trim();
        var digest = SHA256.HashData(Encoding.UTF8.GetBytes(normalizedKey));
        var token = Convert.ToHexString(digest)[..12].ToLowerInvariant();
        var idBlock = 100_000 + (int)(BinaryPrimitives.ReadUInt32BigEndian(digest) % 100_000) * 10;

        return new AuthenticationProtectionScenarioData(normalizedKey, token, idBlock);
    }

    public async Task PersistAsync(
        AppDbContext context,
        IPasswordHasher<Usuario> passwordHasher,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(passwordHasher);

        var administrator = CreateAdministrator(passwordHasher);
        var firstMentor = CreateAcademic(
            MentorOneId,
            MentorOneEmail,
            MentorOnePassword,
            NivelUsuario.Mentor,
            $"mentor-one-{ScenarioToken}",
            passwordHasher);
        var secondMentor = CreateAcademic(
            MentorTwoId,
            MentorTwoEmail,
            MentorTwoPassword,
            NivelUsuario.Mentor,
            $"mentor-two-{ScenarioToken}",
            passwordHasher);
        var firstMentee = CreateAcademic(
            MenteeOneId,
            MenteeOneEmail,
            MenteeOnePassword,
            NivelUsuario.Mentorado,
            $"mentee-one-{ScenarioToken}",
            passwordHasher);
        firstMentee.ResponsavelId = MentorOneId;

        var secondMentee = CreateAcademic(
            MenteeTwoId,
            MenteeTwoEmail,
            MenteeTwoPassword,
            NivelUsuario.Mentorado,
            $"mentee-two-{ScenarioToken}",
            passwordHasher);
        secondMentee.ResponsavelId = MentorTwoId;

        context.Administradores.Add(administrator);
        context.Academicos.AddRange(firstMentor, secondMentor, firstMentee, secondMentee);
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

    private Academico CreateAcademic(
        int id,
        string email,
        string password,
        NivelUsuario level,
        string identity,
        IPasswordHasher<Usuario> passwordHasher)
    {
        var academic = new Academico
        {
            Id = id,
            NomeCompleto = $"Usuário {identity}",
            Email = email,
            SenhaHash = string.Empty,
            NivelUsuario = level,
            TipoUsuario = TipoUsuario.Academico,
            Status = StatusUsuario.Habilitado,
            ExigeTrocaSenha = false,
            VersaoSessao = 0,
            Instituicao = $"Instituição {ScenarioToken}",
            Cidade = "Recife",
            Curso = "Química"
        };
        academic.SenhaHash = passwordHasher.HashPassword(academic, password);
        return academic;
    }
}
