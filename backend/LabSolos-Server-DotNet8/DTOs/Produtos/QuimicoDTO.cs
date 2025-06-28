using LabSolos_Server_DotNet8.DTOs.Lotes;

namespace LabSolos_Server_DotNet8.DTOs.Produtos
{
    public class QuimicoDTO : ProdutoDTO
    {
        public string? EstadoFisico { get; set; } = string.Empty;
        public string? Cor { get; set; } = string.Empty;
        public string? Odor { get; set; } = string.Empty;
        public string FormulaQuimica { get; set; } = string.Empty;
        public float? PesoMolecular { get; set; }
        public float? Densidade { get; set; }
        public string? GrauPureza { get; set; } = string.Empty;
        public string? Grupo { get; set; } = string.Empty;
    }
}
