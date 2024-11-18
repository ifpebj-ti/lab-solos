using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.Models
{
    public class Vidraria : Produto
    {
        public required MaterialVidraria Material { get; set; } //enum
        public required FormatoVidraria Formato { get; set; } //enum
        public required AlturaVidraria Altura { get; set; } //enum
        public float? Capacidade { get; set; }
        public bool? Graduada { get; set; } 
    }
}