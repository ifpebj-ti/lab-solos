namespace LabSolos_Server_DotNet8.DTOs.Usuarios
{
    public class AdministradorDTO
    {
        public int Id { get; set; }
        public string NomeCompleto { get; set; }
        public string Email { get; set; }
        public string? Telefone { get; set; }
        public DateTime DataIngresso { get; set; }
        public string Status { get; set; } // Convertido para string se necessário
    }
}