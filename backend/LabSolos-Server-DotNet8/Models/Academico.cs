using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.Models
{
    public class Academico : Usuario
    {
        public required string Instituição { get; set; }
        public string? Cidade { get; set; }
        public string? Curso { get; set; }
    }
}