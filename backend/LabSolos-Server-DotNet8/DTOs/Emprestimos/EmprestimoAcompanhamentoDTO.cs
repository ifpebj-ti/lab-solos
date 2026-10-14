namespace LabSolos_Server_DotNet8.DTOs.Emprestimos;

public sealed class EmprestimoAcompanhamentoDTO
{
    public int Id { get; set; }

    public DateTime DataRealizacao { get; set; }

    public DateTime? DataPrevistaDevolucao { get; set; }

    public DateTime? DataDevolucao { get; set; }

    public DateTime? DataAprovacao { get; set; }

    public string Status { get; set; } = string.Empty;

    public List<ProdutoEmprestadoAcompanhamentoDTO> Produtos { get; set; } = new();

    public EmprestimoUsuarioAcompanhamentoDTO? Solicitante { get; set; }

    public EmprestimoUsuarioAcompanhamentoDTO? Aprovador { get; set; }
}

public sealed class EmprestimoUsuarioAcompanhamentoDTO
{
    public int Id { get; set; }

    public required string NomeCompleto { get; set; }

    public required string Email { get; set; }

    public string? Telefone { get; set; }

    public DateOnly? DataIngresso { get; set; }

    public string Status { get; set; } = string.Empty;

    public string NivelUsuario { get; set; } = string.Empty;

    public string TipoUsuario { get; set; } = string.Empty;

    public EmprestimoResponsavelAcompanhamentoDTO? Responsavel { get; set; }
}

public sealed class EmprestimoResponsavelAcompanhamentoDTO
{
    public int Id { get; set; }

    public required string NomeCompleto { get; set; }

    public required string Email { get; set; }

    public string? Telefone { get; set; }

    public DateOnly? DataIngresso { get; set; }

    public string Status { get; set; } = string.Empty;

    public string NivelUsuario { get; set; } = string.Empty;

    public string? Cidade { get; set; }

    public string? Curso { get; set; }

    public string? Instituicao { get; set; }
}

public sealed class ProdutoEmprestadoAcompanhamentoDTO
{
    public int EmprestimoId { get; set; }

    public ProdutoAcompanhamentoDTO Produto { get; set; } = null!;

    public int Quantidade { get; set; }
}

public sealed class ProdutoAcompanhamentoDTO
{
    public int Id { get; set; }

    public string Catmat { get; set; } = string.Empty;

    public string NomeProduto { get; set; } = string.Empty;

    public string TipoProduto { get; set; } = string.Empty;

    public string? Fornecedor { get; set; }

    public string? UnidadeMedida { get; set; }

    public float Quantidade { get; set; }

    public float QuantidadeMinima { get; set; }

    public string? LocalizacaoProduto { get; set; }

    public string? DataFabricacao { get; set; }

    public string? DataValidade { get; set; }

    public string UltimaModificacao { get; set; } = string.Empty;

    public string? Status { get; set; }

    public LoteAcompanhamentoDTO? Lote { get; set; }
}

public sealed class LoteAcompanhamentoDTO
{
    public required string CodigoLote { get; set; }

    public string? Fornecedor { get; set; }

    public string? DataFabricacao { get; set; }

    public string? DataValidade { get; set; }

    public string? DataEntrada { get; set; }

    public List<ProdutoAcompanhamentoDTO> Produtos { get; set; } = new();
}
