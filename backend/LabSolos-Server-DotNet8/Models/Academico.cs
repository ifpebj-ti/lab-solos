namespace LabSolos_Server_DotNet8.Models
{
    public class Academico : Usuario
    {
        public required string Instituicao { get; set; }
        public string? Cidade { get; set; }
        public string? Curso { get; set; }
    }
}