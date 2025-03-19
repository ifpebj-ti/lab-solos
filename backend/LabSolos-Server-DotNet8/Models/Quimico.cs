using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.Models
{
    public class Quimico : Produto
    {
        public EstadoFisico? EstadoFisico { get; set; }
        public required Cor Cor { get; set; }
        public required Odor Odor { get; set; }
        public float? Densidade { get; set; }
        public float? PesoMolecular { get; set; }
        public string? GrauPureza { get; set; }
        public string? FormulaQuimica { get; set; }
        public required Grupo Grupo { get; set; } // Enum
    }
}
