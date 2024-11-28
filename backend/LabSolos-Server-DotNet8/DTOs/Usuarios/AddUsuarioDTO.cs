namespace LabSolos_Server_DotNet8.DTOs.Usuarios
{
        public class AddUsuarioDTO
        {
                public required string NomeCompleto { get; set; }
                public required string Email { get; set; }
                public required string Senha { get; set; }
                public string? Telefone { get; set; }
                public int NivelUsuario { get; set; }
        }
}