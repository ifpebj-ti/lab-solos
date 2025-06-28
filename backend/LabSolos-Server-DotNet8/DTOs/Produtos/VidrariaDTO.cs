using LabSolos_Server_DotNet8.DTOs.Lotes;

namespace LabSolos_Server_DotNet8.DTOs.Produtos
{
    public class VidrariaDTO : ProdutoDTO
    {
        public string? Material { get; set; } = string.Empty;
        public string? Formato { get; set; } = string.Empty;
        public string? Altura { get; set; } = string.Empty;
        public float? Capacidade { get; set; }
        public bool? Graduada { get; set; }
    }
}
