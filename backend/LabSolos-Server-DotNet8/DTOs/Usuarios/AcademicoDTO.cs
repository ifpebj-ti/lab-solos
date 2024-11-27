namespace LabSolos_Server_DotNet8.DTOs.Usuarios
{
    public class AcademicoDTO
    {
        public int Id { get; set; }
        public string NomeCompleto { get; set; }
        public string Email { get; set; }
        public string? Telefone { get; set; }
        public string Nivel { get; set; }
        public string Instituicao { get; set; }
        public string? Curso { get; set; }
        public string Status { get; set; } // Convertido para string
    }
}