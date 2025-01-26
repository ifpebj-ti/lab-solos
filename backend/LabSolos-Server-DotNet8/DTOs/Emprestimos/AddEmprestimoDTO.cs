namespace LabSolos_Server_DotNet8.Dtos.Emprestimos
{
    public class AddEmprestimoDTO
    {
        public int DiasParaDevolucao { get; set; }
        public int SolicitanteId { get; set; }
        public List<int> ProdutosIds { get; set; } = [];
    }
}
