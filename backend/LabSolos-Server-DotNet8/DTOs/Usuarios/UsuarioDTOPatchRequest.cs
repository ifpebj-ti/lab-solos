namespace LabSolos_Server_DotNet8.DTOs.Usuarios
{
    public class UsuarioDTOPatchRequest
    {
        public string? NomeCompleto { get; set; }
        public string? Email { get; set; }
        public string? Telefone { get; set; }
        public string? Status { get; set; }
    }
}
