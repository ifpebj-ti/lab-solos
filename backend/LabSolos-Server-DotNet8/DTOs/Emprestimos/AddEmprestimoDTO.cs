namespace LabSolos_Server_DotNet8.Dtos.Emprestimos
{
    public class AddEmprestimoDTO
    {
        public int DiasParaDevolucao { get; set; }
        public int SolicitanteId { get; set; }
        public List<ProdutoQuantidadeDTO> Produtos { get; set; } = new List<ProdutoQuantidadeDTO>();
    }

    public class ProdutoQuantidadeDTO
    {
        public int ProdutoId { get; set; }
        public int Quantidade { get; set; }
    }
}
