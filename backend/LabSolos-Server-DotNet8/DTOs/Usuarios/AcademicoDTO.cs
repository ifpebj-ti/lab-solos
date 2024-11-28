namespace LabSolos_Server_DotNet8.DTOs.Usuarios
{
    public class AcademicoDTO : UsuarioDTO
    {
        public string Instituicao { get; set; }
        public string? Curso { get; set; }
    }
}