using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Linq.Expressions;
using System.Security.Claims;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Services.Security;

public sealed class UserResourceAccessService
{
    public Expression<Func<Usuario, bool>> ForProfiles(ClaimsPrincipal? principal)
    {
        if (!TryResolveSubject(principal, out var subject))
        {
            return _ => false;
        }

        return subject.Role switch
        {
            NivelUsuario.Administrador => _ => true,
            NivelUsuario.Mentor => usuario =>
                usuario.Id == subject.UserId ||
                (usuario.NivelUsuario == NivelUsuario.Mentorado && usuario.ResponsavelId == subject.UserId),
            NivelUsuario.Mentorado => usuario => usuario.Id == subject.UserId,
            _ => _ => false
        };
    }

    public Expression<Func<Usuario, bool>> ForLinkedMentees(ClaimsPrincipal? principal)
    {
        if (!TryResolveSubject(principal, out var subject))
        {
            return _ => false;
        }

        return subject.Role switch
        {
            NivelUsuario.Administrador => usuario => usuario.NivelUsuario == NivelUsuario.Mentorado,
            NivelUsuario.Mentor => usuario =>
                usuario.NivelUsuario == NivelUsuario.Mentorado &&
                usuario.ResponsavelId == subject.UserId,
            _ => _ => false
        };
    }

    public Expression<Func<Emprestimo, bool>> ForLoans(ClaimsPrincipal? principal)
    {
        if (!TryResolveSubject(principal, out var subject))
        {
            return _ => false;
        }

        return subject.Role switch
        {
            NivelUsuario.Administrador => _ => true,
            NivelUsuario.Mentor => emprestimo =>
                emprestimo.SolicitanteId == subject.UserId ||
                emprestimo.AprovadorId == subject.UserId ||
                (emprestimo.Solicitante != null &&
                 emprestimo.Solicitante.NivelUsuario == NivelUsuario.Mentorado &&
                 emprestimo.Solicitante.ResponsavelId == subject.UserId),
            NivelUsuario.Mentorado => emprestimo =>
                emprestimo.SolicitanteId == subject.UserId ||
                emprestimo.AprovadorId == subject.UserId,
            _ => _ => false
        };
    }

    private static bool TryResolveSubject(ClaimsPrincipal? principal, out AccessSubject subject)
    {
        subject = default;
        if (principal?.Identity is not ClaimsIdentity identity || !identity.IsAuthenticated)
        {
            return false;
        }

        var subjectValues = identity.Claims
            .Where(claim => claim.Type is ClaimTypes.NameIdentifier or JwtRegisteredClaimNames.Sub)
            .Select(claim => claim.Value)
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        if (subjectValues.Length != 1 ||
            !int.TryParse(subjectValues[0], NumberStyles.None, CultureInfo.InvariantCulture, out var userId) ||
            userId <= 0)
        {
            return false;
        }

        var roleValues = identity.Claims
            .Where(claim => claim.Type is ClaimTypes.Role or "role")
            .Select(claim => claim.Value)
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        if (roleValues.Length != 1 ||
            !Enum.TryParse<NivelUsuario>(roleValues[0], ignoreCase: false, out var role) ||
            !Enum.IsDefined(role) ||
            role is not (NivelUsuario.Administrador or NivelUsuario.Mentor or NivelUsuario.Mentorado))
        {
            return false;
        }

        subject = new AccessSubject(userId, role);
        return true;
    }

    private readonly record struct AccessSubject(int UserId, NivelUsuario Role);
}
