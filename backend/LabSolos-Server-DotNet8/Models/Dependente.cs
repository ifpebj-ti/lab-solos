namespace LabSolos_Server_DotNet8.Models
{
    public class Dependente
    {
        public int Id { get; set; }
        public int ResponsavelId { get; set; } // ID do Mentor responsável
        public Usuario Responsavel { get; set; } // Relação com o mentor
        public ICollection<Usuario> Associados { get; set; } // Lista de mentorandos vinculados
    }
}