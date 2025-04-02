namespace LabSolos_Server_DotNet8.DTOs.System
{
    public class QuantitiesDTO
    {
        public Dictionary<string, int> Produtos { get; set; } = [];
        public Dictionary<string, int> Alertas { get; set; } = [];
        public Dictionary<string, int> Usuarios { get; set; } = [];
        public Dictionary<string, int> Emprestimos { get; set; } = [];
        public int TotalProdutosEmprestados { get; set; }
    }
}
