using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Enums;
using Microsoft.EntityFrameworkCore;
using LabSolos_Server_DotNet8.DTOs.System;
using LabSolos_Server_DotNet8.Repositories;

namespace LabSolos_Server_DotNet8.Services
{
    public interface ISystemService
    {
        Task<QuantitiesDTO> GetSystemQuantitiesAsync();
    }

    public class SystemService(IProdutoRepository produtoRepository, IUsuarioRepository usuarioRepository, IEmprestimoRepository emprestimoRepository) : ISystemService
    {

        private readonly IProdutoRepository _produtoRepository = produtoRepository;
        private readonly IUsuarioRepository _usuarioRepository = usuarioRepository;
        private readonly IEmprestimoRepository _emprestimoRepository = emprestimoRepository;

        public async Task<QuantitiesDTO> GetSystemQuantitiesAsync()
        {
            // Obtém todos os produtos
            var produtos = await _produtoRepository.GetAllAsync();

            // Agrupa por tipo e conta os produtos em cada grupo
            var productCountsByType = produtos
                .GroupBy(p => p.Tipo)
                .ToDictionary(
                    g => g.Key.ToString(), // Converte o enum para string
                    g => g.Count()         // Conta os produtos no grupo
                );

            // Total de produtos
            var totalProducts = produtos.Count();

            productCountsByType["Total"] = totalProducts;

            var usuarios = await _usuarioRepository.GetAllAsync();

            var userCountByType = usuarios
                .GroupBy(u => u.NivelUsuario)
                    .ToDictionary(
                        g => g.Key.ToString(), // Converte o enum para string
                        g => g.Count()         // Conta os produtos no grupo
                    );

            userCountByType["Total"] = usuarios.Count();

            var emprestimos = await _emprestimoRepository.GetTodosEmprestimosAsync();

            var emprestimosAgrupadosPeloStatus = emprestimos
                .GroupBy(e => e.Status)
                    .ToDictionary(
                        g => g.Key.ToString(), // Converte o enum para string
                        g => g.Count()
                    );

            // Total de empréstimos
            emprestimosAgrupadosPeloStatus["Total"] = emprestimos.Count();

            // Contagem total de produtos emprestados
            int totalProdutosEmprestados = emprestimos
                .SelectMany(e => e.EmprestimoProdutos)
                .Count();

            var produtosEmAlerta = await _produtoRepository.GetProdutosEmAlerta();

            // Agrupa por tipo e conta os produtos em cada grupo
            var alertas = new Dictionary<string, int>
            {
                { "ProdutosVencidos", produtosEmAlerta.Count(p => p.DataValidade < DateTime.Today.AddDays(-10)) },
                { "ProdutosEmBaixa", produtosEmAlerta.Count(p => p.Quantidade < p.QuantidadeMinima) }
            };

            // Cria e retorna o DTO
            return new QuantitiesDTO
            {
                Produtos = productCountsByType,
                Alertas = alertas,
                Usuarios = userCountByType,
                Emprestimos = emprestimosAgrupadosPeloStatus,
                TotalProdutosEmprestados = totalProdutosEmprestados
            };
        }
    }
}
