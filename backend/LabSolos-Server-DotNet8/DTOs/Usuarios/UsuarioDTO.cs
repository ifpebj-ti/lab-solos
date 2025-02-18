namespace LabSolos_Server_DotNet8.DTOs.Usuarios
{
        public class UsuarioDTO
        {
                public int Id { get; set; }
                public required string NomeCompleto { get; set; }
                public string? Senha { get; set; } = string.Empty;
                public required string Email { get; set; }
                public string? Telefone { get; set; }
                public DateTime DataIngresso { get; set; }
                public string Status { get; set; }
                public string NivelUsuario { get; set; }
                public string? NomeResponsavel { get; set; }
                public int? ResponsavelId { get; set; }


        }
}