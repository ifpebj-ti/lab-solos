using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.Models
{
    public class Quimico : Produto
    {
        public string Catmat { get; set; }
        public UnidadeMedida UnidadeMedida { get; set; }  // Enum
        public Grupo Grupo { get; set; }  // Enum
        public string Formula { get; set; }
    }
}