namespace LabSolos_Server_DotNet8.DTOs.Paginacao;

public sealed record ResultadoPaginado<TItem>(
    IReadOnlyList<TItem> Itens,
    int Pagina,
    int TamanhoPagina,
    long TotalItens,
    long TotalPaginas)
{
    public ResultadoPaginado<TResult> Projetar<TResult>(Func<TItem, TResult> projetar) =>
        new(Itens.Select(projetar).ToArray(), Pagina, TamanhoPagina, TotalItens, TotalPaginas);
}

public static class ResultadoPaginado
{
    public static ResultadoPaginado<TItem> Criar<TItem>(
        IReadOnlyList<TItem> itens,
        int pagina,
        int tamanhoPagina,
        long totalItens)
    {
        var totalPaginas = totalItens / tamanhoPagina + (totalItens % tamanhoPagina == 0 ? 0 : 1);
        return new ResultadoPaginado<TItem>(itens, pagina, tamanhoPagina, totalItens, totalPaginas);
    }
}
