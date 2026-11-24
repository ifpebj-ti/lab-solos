using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Services.Security;

public static class PoliticaContas
{
    public static bool TryGetPublicRole(AddUsuarioDTO request, out NivelUsuario role)
    {
        role = NivelUsuario.Mentor;
        if (!string.Equals(request.TipoUsuario, nameof(TipoUsuario.Academico), StringComparison.Ordinal))
            return false;

        if (request.NivelUsuario == nameof(NivelUsuario.Mentorado))
            role = NivelUsuario.Mentorado;

        return request.NivelUsuario is nameof(NivelUsuario.Mentor) or nameof(NivelUsuario.Mentorado);
    }

    public static bool IsEnabledAdministrator(Usuario user) =>
        user.Status == StatusUsuario.Habilitado && user.NivelUsuario == NivelUsuario.Administrador;

    public static bool IsEligibleResponsible(Usuario? user) =>
        user is { Status: StatusUsuario.Habilitado, NivelUsuario: NivelUsuario.Mentor or NivelUsuario.Administrador };

    public static bool CanDecide(Usuario actor, Usuario pending) =>
        pending.Status == StatusUsuario.Pendente
        && pending.TipoUsuario == TipoUsuario.Academico
        && pending.NivelUsuario is NivelUsuario.Mentor or NivelUsuario.Mentorado
        && (IsEnabledAdministrator(actor)
            || actor.Status == StatusUsuario.Habilitado
            && actor.NivelUsuario == NivelUsuario.Mentor
            && pending.NivelUsuario == NivelUsuario.Mentorado
            && pending.ResponsavelId == actor.Id);

    public static void ApplyRegistration(Usuario user, NivelUsuario role, int? responsibleId)
    {
        user.TipoUsuario = TipoUsuario.Academico;
        user.NivelUsuario = role;
        user.Status = StatusUsuario.Pendente;
        user.ResponsavelId = role == NivelUsuario.Mentorado ? responsibleId : null;
    }
}
