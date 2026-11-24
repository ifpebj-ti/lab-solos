using System.Globalization;

namespace LabSolos_Server_DotNet8.DTOs.Paginacao;

public sealed record ParametrosPaginacao(int Pagina, int TamanhoPagina, int Deslocamento)
{
    public const int PaginaPadrao = 1;
    public const int TamanhoPaginaPadrao = 25;
    public const int TamanhoPaginaMaximo = 100;

    public static bool TentarCriar(
        string? paginaInformada,
        string? tamanhoPaginaInformado,
        out ParametrosPaginacao parametros,
        out string parametroInvalido)
    {
        var pagina = PaginaPadrao;
        var tamanhoPagina = TamanhoPaginaPadrao;

        if (paginaInformada is not null &&
            (!int.TryParse(paginaInformada, NumberStyles.Integer, CultureInfo.InvariantCulture, out pagina) || pagina < 1))
        {
            parametros = default!;
            parametroInvalido = "pagina";
            return false;
        }

        if (tamanhoPaginaInformado is not null &&
            (!int.TryParse(tamanhoPaginaInformado, NumberStyles.Integer, CultureInfo.InvariantCulture, out tamanhoPagina) ||
             tamanhoPagina < 1 || tamanhoPagina > TamanhoPaginaMaximo))
        {
            parametros = default!;
            parametroInvalido = "tamanhoPagina";
            return false;
        }

        var deslocamento = ((long)pagina - 1) * tamanhoPagina;
        if (deslocamento > int.MaxValue)
        {
            parametros = default!;
            parametroInvalido = "pagina";
            return false;
        }

        parametros = new ParametrosPaginacao(pagina, tamanhoPagina, (int)deslocamento);
        parametroInvalido = string.Empty;
        return true;
    }
}
