namespace LabSolos_Server_DotNet8.DTOs.Email
{
    public class RedefinirSenhaDTO
    {
        public string? Email { get; set; }
        public string? Token { get; set; }
        public string? NovaSenha { get; set; }
        public string? Confirmacao { get; set; }
    }
}
