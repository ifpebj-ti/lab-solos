using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LabSolos_Server_DotNet8.DTOs.Emprestimos;
using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Enums;

namespace LabSolos_Server_DotNet8.Models
{
    public class Emprestimo
    {
        public int Id { get; set; }
        public required DateTime DataRealizacao { get; set; }
        public DateTime? DataDevolucao { get; set; }
        public DateTime? DataAprovacao { get; set; }
        public required StatusEmprestimo Status { get; set; }

        public List<EmprestimoProduto> EmprestimoProdutos { get; set; } = new();

        // Referência ao Solicitante do empréstimo (sempre obrigatório)
        public required int SolicitanteId { get; set; }
        public Usuario Solicitante { get; set; } = null!; // Solicitante do empréstimo

        // Referência ao Aprovador, se necessário
        public int? AprovadorId { get; set; }
        public Usuario? Aprovador { get; set; } // Aprovador do empréstimo

        public static EmprestimoDTO MapToDTO(Emprestimo emprestimo)
        {
            return new EmprestimoDTO
            {
                Id = emprestimo.Id,
                DataRealizacao = emprestimo.DataRealizacao,
                DataDevolucao = emprestimo.DataDevolucao,
                DataAprovacao = emprestimo.DataAprovacao,
                Status = emprestimo.Status.ToString(),
                Solicitante = emprestimo.Solicitante != null ? new UsuarioDTO { Id = emprestimo.Solicitante.Id, NomeCompleto = emprestimo.Solicitante.NomeCompleto, Email = emprestimo.Solicitante.Email } : null,
                Aprovador = emprestimo.Aprovador != null ? new UsuarioDTO { Id = emprestimo.Aprovador.Id, NomeCompleto = emprestimo.Aprovador.NomeCompleto, Email = emprestimo.Aprovador.Email } : null,
                EmprestimoProdutos = emprestimo.EmprestimoProdutos.Select(ep => new EmprestimoProdutoDTO
                {
                    Id = ep.Id,
                    EmprestimoId = ep.EmprestimoId,
                    ProdutoId = ep.ProdutoId,
                    Quantidade = ep.Quantidade,
                    Produto = new ProdutoDTO
                    {
                        Id = ep.Produto.Id,
                        NomeProduto = ep.Produto.NomeProduto,
                        Fornecedor = ep.Produto.Fornecedor,
                        TipoProduto = ep.Produto.Tipo.ToString(),
                        Quantidade = ep.Produto.Quantidade,
                        QuantidadeMinima = ep.Produto.QuantidadeMinima,
                        DataFabricacao = ep.Produto.DataFabricacao.ToString(),
                        DataValidade = ep.Produto.DataValidade.ToString(),
                        LocalizacaoProduto = ep.Produto.LocalizacaoProduto,
                        Status = ep.Produto.Status.ToString()
                    }
                }).ToList()
            };
        }

        public static Emprestimo MapFromDTO(EmprestimoDTO dto)
        {
            return new Emprestimo
            {
                Id = dto.Id,
                DataRealizacao = dto.DataRealizacao,
                DataDevolucao = dto.DataDevolucao,
                DataAprovacao = dto.DataAprovacao,
                Status = Enum.Parse<StatusEmprestimo>(dto.Status),

                SolicitanteId = dto.Solicitante!.Id,
                Solicitante = dto.Solicitante != null ? new Usuario
                {
                    Id = dto.Solicitante.Id,
                    SenhaHash = dto.Solicitante.Senha!,
                    NomeCompleto = dto.Solicitante.NomeCompleto,
                    Email = dto.Solicitante.Email
                } : null!,

                AprovadorId = dto.Aprovador?.Id,
                Aprovador = dto.Aprovador != null ? new Usuario
                {
                    Id = dto.Aprovador.Id,
                    SenhaHash = dto.Aprovador.Senha!,
                    NomeCompleto = dto.Aprovador.NomeCompleto,
                    Email = dto.Aprovador.Email
                } : null,

                EmprestimoProdutos = dto.EmprestimoProdutos.Select(ep => new EmprestimoProduto
                {
                    Id = ep.Id,
                    EmprestimoId = ep.EmprestimoId,
                    ProdutoId = ep.ProdutoId,
                    Quantidade = ep.Quantidade,
                    Produto = new Produto
                    {
                        Id = ep.Produto.Id,
                        NomeProduto = ep.Produto.NomeProduto,
                        Fornecedor = ep.Produto.Fornecedor,
                        Tipo = Enum.Parse<TipoProduto>(ep.Produto.TipoProduto),
                        Quantidade = ep.Produto.Quantidade,
                        QuantidadeMinima = ep.Produto.QuantidadeMinima,
                        DataFabricacao = DateTime.TryParse(ep.Produto.DataFabricacao, out var dataFabricacao) ? dataFabricacao : null,
                        DataValidade = DateTime.TryParse(ep.Produto.DataValidade, out var dataValidade) ? dataValidade : null,
                        LocalizacaoProduto = ep.Produto?.LocalizacaoProduto ?? string.Empty,
                        Status = Enum.TryParse<StatusProduto>(ep.Produto!.Status, out var statusProduto) ? statusProduto : StatusProduto.Indefinido // Defina um padrão adequado

                    }
                }).ToList()
            };            
        }
    }
}
