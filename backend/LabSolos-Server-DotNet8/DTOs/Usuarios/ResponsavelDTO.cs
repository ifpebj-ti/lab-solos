namespace LabSolos_Server_DotNet8.DTOs.Usuarios
{
    public class ResponsavelDTO
    {
        public int Id { get; set; }
        public required string NomeCompleto { get; set; }
        public required string Email { get; set; }
        public string? Telefone { get; set; }
        public string DataIngresso { get; set; }
        public string Status { get; set; }
        public string NivelUsuario { get; set; }
        public string? Cidade { get; set; }
        public string? Curso { get; set; }
        public string? Instituicao { get; set; }
    }
}