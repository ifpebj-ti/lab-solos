using System.ComponentModel.DataAnnotations;

namespace LabSolos_Server_DotNet8.DTOs.Usuarios
{
        public class AddUsuarioDTO
        {
                [StringLength(255)]
                public required string NomeCompleto { get; set; }

                [StringLength(254)]
                public required string Email { get; set; }

                public required string Senha { get; set; }

                [StringLength(254)]
                public string? ResponsavelEmail { get; set; }

                [StringLength(255)]
                public string? Telefone { get; set; }

                [StringLength(255)]
                public string NivelUsuario { get; set; }

                [StringLength(255)]
                public string TipoUsuario { get; set; }

                [StringLength(255)]
                public string? Instituicao { get; set; }

                [StringLength(255)]
                public string? Cidade { get; set; }

                [StringLength(100)]
                public string? Curso { get; set; }
        }
}
