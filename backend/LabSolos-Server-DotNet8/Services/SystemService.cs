using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Enums;
using Microsoft.EntityFrameworkCore;
using LabSolos_Server_DotNet8.DTOs.System;
using LabSolos_Server_DotNet8.Repositories;
using AutoMapper;

namespace LabSolos_Server_DotNet8.Services
{
    public interface ISystemService
    {
        Task<QuantidadesDTO> GetSystemQuantitiesAsync();
    }

    public class SystemService : ISystemService
    {
        private readonly IUnitOfWork _uow;

        public SystemService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<QuantidadesDTO> GetSystemQuantitiesAsync()
        {
            // Obtém todos os produtos
            var produtos = await _uow.ProdutoRepository.ObterTodosAsync(e => true);

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

            var usuarios = await _uow.UsuarioRepository.ObterTodosAsync(e => true);

            var userCountByType = usuarios
                .GroupBy(u => u.NivelUsuario)
                    .ToDictionary(
                        g => g.Key.ToString(), // Converte o enum para string
                        g => g.Count()         // Conta os produtos no grupo
                    );

            userCountByType["Total"] = usuarios.Count();

            var emprestimos = await _uow.EmprestimoRepository.ObterTodosAsync(e => true);

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
                .SelectMany(e => e.Produtos)
                .Count();

            var produtosEmAlerta = await _uow.ProdutoRepository.ObterTodosAsync(p => p.Quantidade <= p.QuantidadeMinima || p.DataValidade <= DateTime.UtcNow.AddDays(10));

            // Agrupa por tipo e conta os produtos em cada grupo
            var alertas = new Dictionary<string, int>
            {
                { "ProdutosVencidos", produtosEmAlerta.Count(p => p.DataValidade < DateTime.UtcNow.Date.AddDays(-10)) },
                { "ProdutosEmBaixa", produtosEmAlerta.Count(p => p.Quantidade < p.QuantidadeMinima) }
            };

            // Cria e retorna o DTO
            return new QuantidadesDTO
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
