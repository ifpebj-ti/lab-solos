namespace LabSolos_Server_DotNet8.DTOs
{
    public class ResultadoValidacaoDTO
    {
        public bool Validado { get; set; }
        public string Mensagem { get; set; }
        public Dictionary<string, string[]>? ErrosPorCampo { get; init; }
    }
}
