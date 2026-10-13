using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Services.Security;

namespace Tests.Security;

public sealed class UserResourceAccessTests
{
    private readonly UserResourceAccessService _service = new();

    [Fact]
    public void ProfilePredicateAllowsOwnerAdministratorAndOnlyLinkedMentees()
    {
        var mentor = CreateUser(100, NivelUsuario.Mentor);
        var otherMentor = CreateUser(101, NivelUsuario.Mentor);
        var mentee = CreateUser(200, NivelUsuario.Mentorado, responsibleId: mentor.Id);
        var otherMentee = CreateUser(201, NivelUsuario.Mentorado, responsibleId: otherMentor.Id);
        var administrator = CreateUser(1, NivelUsuario.Administrador);

        AssertProfileAccess(Principal(mentor), mentor, allowed: true);
        AssertProfileAccess(Principal(mentor), mentee, allowed: true);
        AssertProfileAccess(Principal(mentor), otherMentee, allowed: false);
        AssertProfileAccess(Principal(mentor), otherMentor, allowed: false);

        AssertProfileAccess(Principal(mentee), mentee, allowed: true);
        AssertProfileAccess(Principal(mentee), otherMentee, allowed: false);
        AssertProfileAccess(Principal(administrator), otherMentee, allowed: true);
    }

    [Fact]
    public void ProfilePredicateDoesNotTreatTargetOrClientIdsAsRelationshipProof()
    {
        var mentor = CreateUser(100, NivelUsuario.Mentor);
        var forgedRelationship = CreateUser(200, NivelUsuario.Mentorado, responsibleId: 999);

        AssertProfileAccess(Principal(mentor), forgedRelationship, allowed: false);
    }

    [Fact]
    public void LinkedMenteePredicateLimitsQueriesToMenteesOfTheAuthenticatedMentor()
    {
        var mentor = CreateUser(100, NivelUsuario.Mentor);
        var otherMentor = CreateUser(101, NivelUsuario.Mentor);
        var mentee = CreateUser(200, NivelUsuario.Mentorado, responsibleId: mentor.Id);
        var otherMentee = CreateUser(201, NivelUsuario.Mentorado, responsibleId: otherMentor.Id);

        AssertLinkedMenteeAccess(Principal(mentor), mentee, allowed: true);
        AssertLinkedMenteeAccess(Principal(mentor), otherMentee, allowed: false);
        AssertLinkedMenteeAccess(Principal(mentor), mentor, allowed: false);
        AssertLinkedMenteeAccess(Principal(mentee), otherMentee, allowed: false);
        AssertLinkedMenteeAccess(Principal(CreateUser(1, NivelUsuario.Administrador)), otherMentee, allowed: true);
    }

    [Fact]
    public void LoanPredicateAllowsRequesterApproverAndMentorOfRequester()
    {
        var mentor = CreateUser(100, NivelUsuario.Mentor);
        var otherMentor = CreateUser(101, NivelUsuario.Mentor);
        var mentee = CreateUser(200, NivelUsuario.Mentorado, responsibleId: mentor.Id);
        var otherMentee = CreateUser(201, NivelUsuario.Mentorado, responsibleId: otherMentor.Id);
        var unrelatedApplicant = CreateUser(202, NivelUsuario.Mentorado);

        AssertLoanAccess(Principal(mentee), CreateLoan(mentee), allowed: true);
        AssertLoanAccess(Principal(mentor), CreateLoan(unrelatedApplicant, approverId: mentor.Id), allowed: true);
        AssertLoanAccess(Principal(mentor), CreateLoan(mentee), allowed: true);
        AssertLoanAccess(Principal(CreateUser(1, NivelUsuario.Administrador)), CreateLoan(otherMentee), allowed: true);
    }

    [Fact]
    public void LoanPredicateDeniesCrossMenteeAndUnlinkedMentorAccess()
    {
        var mentor = CreateUser(100, NivelUsuario.Mentor);
        var otherMentor = CreateUser(101, NivelUsuario.Mentor);
        var mentee = CreateUser(200, NivelUsuario.Mentorado, responsibleId: mentor.Id);
        var otherMentee = CreateUser(201, NivelUsuario.Mentorado, responsibleId: otherMentor.Id);

        AssertLoanAccess(Principal(mentee), CreateLoan(otherMentee), allowed: false);
        AssertLoanAccess(Principal(mentor), CreateLoan(otherMentee), allowed: false);
    }

    [Theory]
    [InlineData(NivelUsuario.Comum)]
    public void UnsupportedRoleCannotAccessProfilesLinksOrLoans(NivelUsuario role)
    {
        var unsupported = Principal(CreateUser(300, role));
        var target = CreateUser(301, NivelUsuario.Mentorado, responsibleId: 300);
        var loan = CreateLoan(target);

        AssertProfileAccess(unsupported, target, allowed: false);
        AssertLinkedMenteeAccess(unsupported, target, allowed: false);
        AssertLoanAccess(unsupported, loan, allowed: false);
    }

    [Fact]
    public void MissingUnauthenticatedInvalidOrConflictingIdentityIsDenied()
    {
        var target = CreateUser(200, NivelUsuario.Mentorado);
        var loan = CreateLoan(target);
        var noSubject = PrincipalWithClaims(authenticated: true, new Claim(ClaimTypes.Role, "Mentor"));
        var malformedSubject = PrincipalWithClaims(
            authenticated: true,
            new Claim(ClaimTypes.NameIdentifier, "not-an-id"),
            new Claim(ClaimTypes.Role, "Mentor"));
        var unauthenticated = PrincipalWithClaims(
            authenticated: false,
            new Claim(ClaimTypes.NameIdentifier, "100"),
            new Claim(ClaimTypes.Role, "Mentor"));
        var conflictingSubjects = PrincipalWithClaims(
            authenticated: true,
            new Claim(ClaimTypes.NameIdentifier, "100"),
            new Claim(JwtRegisteredClaimNames.Sub, "101"),
            new Claim(ClaimTypes.Role, "Mentor"));
        var conflictingRoles = PrincipalWithClaims(
            authenticated: true,
            new Claim(ClaimTypes.NameIdentifier, "100"),
            new Claim(ClaimTypes.Role, "Mentor"),
            new Claim(ClaimTypes.Role, "Administrador"));

        foreach (var principal in new[]
                 {
                     noSubject,
                     malformedSubject,
                     unauthenticated,
                     conflictingSubjects,
                     conflictingRoles
                 })
        {
            AssertProfileAccess(principal, target, allowed: false);
            AssertLinkedMenteeAccess(principal, target, allowed: false);
            AssertLoanAccess(principal, loan, allowed: false);
        }
    }

    [Fact]
    public void SubjectClaimSupportsTheValidatedJwtSubClaim()
    {
        var principal = PrincipalWithClaims(
            authenticated: true,
            new Claim(JwtRegisteredClaimNames.Sub, "100"),
            new Claim(ClaimTypes.Role, "Mentor"));
        var linkedMentee = CreateUser(200, NivelUsuario.Mentorado, responsibleId: 100);

        AssertProfileAccess(principal, linkedMentee, allowed: true);
    }

    [Fact]
    public void SubjectIsResolvedFromTheAuthenticatedIdentityWithoutMixingOtherIdentities()
    {
        var validatedIdentity = new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, "100"),
            new Claim(ClaimTypes.Role, "Mentor")
        ],
        authenticationType: "validated");
        var secondaryIdentity = new ClaimsIdentity(
        [new Claim(ClaimTypes.NameIdentifier, "101")],
        authenticationType: "secondary");
        var principal = new ClaimsPrincipal([validatedIdentity, secondaryIdentity]);
        var linkedMentee = CreateUser(200, NivelUsuario.Mentorado, responsibleId: 100);

        AssertProfileAccess(principal, linkedMentee, allowed: true);
    }

    private void AssertProfileAccess(ClaimsPrincipal principal, Usuario target, bool allowed)
    {
        Assert.Equal(allowed, _service.ForProfiles(principal).Compile()(target));
    }

    private void AssertLinkedMenteeAccess(ClaimsPrincipal principal, Usuario target, bool allowed)
    {
        Assert.Equal(allowed, _service.ForLinkedMentees(principal).Compile()(target));
    }

    private void AssertLoanAccess(ClaimsPrincipal principal, Emprestimo target, bool allowed)
    {
        Assert.Equal(allowed, _service.ForLoans(principal).Compile()(target));
    }

    private static ClaimsPrincipal Principal(Usuario user) => PrincipalWithClaims(
        authenticated: true,
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString(System.Globalization.CultureInfo.InvariantCulture)),
        new Claim(ClaimTypes.Role, user.NivelUsuario.ToString()));

    private static ClaimsPrincipal PrincipalWithClaims(bool authenticated, params Claim[] claims)
    {
        var identity = new ClaimsIdentity(
            claims,
            authenticationType: authenticated ? "test" : null,
            nameType: ClaimTypes.Name,
            roleType: ClaimTypes.Role);
        return new ClaimsPrincipal(identity);
    }

    private static Usuario CreateUser(int id, NivelUsuario level, int? responsibleId = null) => new()
    {
        Id = id,
        NomeCompleto = $"Pessoa {id}",
        Email = $"pessoa{id}@example.invalid",
        SenhaHash = "hash",
        NivelUsuario = level,
        ResponsavelId = responsibleId
    };

    private static Emprestimo CreateLoan(Usuario requester, int? approverId = null) => new()
    {
        DataRealizacao = new DateTime(2026, 10, 13, 12, 0, 0, DateTimeKind.Utc),
        Status = default,
        SolicitanteId = requester.Id,
        Solicitante = requester,
        AprovadorId = approverId
    };
}
