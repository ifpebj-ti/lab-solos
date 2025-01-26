namespace LabSolos_Server_DotNet8.DTOs.Usuarios
{
        public class AddUsuarioDTO
        {
                public required string NomeCompleto { get; set; }
                public required string Email { get; set; }
                public required string Senha { get; set; }
                public required string ResponsavelEmail { get; set; }
                public string? Telefone { get; set; }
                public string NivelUsuario { get; set; }
                public string TipoUsuario { get; set; }
                public string? Instituicao { get; set; }
                public string? Cidade { get; set; }
                public string? Curso { get; set; }
        }
}