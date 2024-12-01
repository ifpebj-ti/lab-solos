using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Tests.Repositories
{
    public class ProdutoRepositoryTests
    {
        private AppDbContext ObterDbContextEmMemoria(string nomeDoBanco)
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: nomeDoBanco)
                .Options;

                return new AppDbContext(options);
        }

        private ProdutoRepository ObterProdutoRepositoryComLogger(AppDbContext contexto)
        {
            var loggerMock = new Mock<ILogger<ProdutoRepository>>();
            return new ProdutoRepository(contexto, loggerMock.Object);
        }

        [Fact]
        public async Task AdicionarAsync_DeveAdicionarProduto()
        {
            // Arrange
            var contexto = ObterDbContextEmMemoria("BancoTeste_Add");
            var repositorio = ObterProdutoRepositoryComLogger(contexto);
            var produto = new Quimico
            {
                Id = 1,
                NomeProduto = "Produto Teste",
                Quantidade = 10,
                QuantidadeMinima = 5,
                LocalizacaoProduto = "Prateleira A",
                Status = StatusProduto.Disponivel,
                UnidadeMedida = UnidadeMedida.Litro,
                Cor = Cor.Incolor,
                Grupo = Grupo.Acido,
                Odor = Odor.Inodoro
            };

            // Act
            await repositorio.AddAsync(produto);
            var resultado = await repositorio.GetByIdAsync(1);

            // Assert
            Assert.NotNull(resultado);
            Assert.Equal("Produto Teste", resultado.NomeProduto);
        }

        [Fact]
        public async Task ObterTodosAsync_DeveRetornarTodosOsProdutos()
        {
            // Arrange
            var contexto = ObterDbContextEmMemoria("BancoTeste_GetAll");
            var repositorio = ObterProdutoRepositoryComLogger(contexto);
            await repositorio.AddAsync(new Quimico
            {
                Id = 1,
                NomeProduto = "Produto 1",
                Quantidade = 10,
                QuantidadeMinima = 5,
                LocalizacaoProduto = "Prateleira A",
                Status = StatusProduto.Disponivel,
                UnidadeMedida = UnidadeMedida.Litro,
                Cor = Cor.Incolor,
                Grupo = Grupo.Base,
                Odor = Odor.Inodoro
            });
            await repositorio.AddAsync(new Quimico
            {
                Id = 2,
                NomeProduto = "Produto 2",
                Quantidade = 20,
                QuantidadeMinima = 10,
                LocalizacaoProduto = "Prateleira B",
                Status = StatusProduto.EmUso,
                UnidadeMedida = UnidadeMedida.Grama,
                Cor = Cor.Branco,
                Grupo = Grupo.Sal,
                Odor = Odor.Aromatico
            });

            // Act
            var resultado = await repositorio.GetAllAsync();

            // Assert
            Assert.Equal(2, resultado.Count());
        }

        [Fact]
        public async Task AtualizarAsync_DeveAtualizarProduto()
        {
            // Arrange
            var contexto = ObterDbContextEmMemoria("BancoTeste_Update");
            var repositorio = ObterProdutoRepositoryComLogger(contexto);
            var produto = new Quimico
            {
                Id = 1,
                NomeProduto = "Produto Antigo",
                Quantidade = 10,
                QuantidadeMinima = 5,
                LocalizacaoProduto = "Prateleira C",
                Status = StatusProduto.Disponivel,
                UnidadeMedida = UnidadeMedida.Litro,
                Cor = Cor.Incolor,
                Grupo = Grupo.Base,
                Odor = Odor.Inodoro
            };
            await repositorio.AddAsync(produto);

            // Act
            produto.NomeProduto = "Produto Atualizado";
            await repositorio.UpdateAsync(produto);
            var resultado = await repositorio.GetByIdAsync(1);

            // Assert
            Assert.NotNull(resultado);
            Assert.Equal("Produto Atualizado", resultado.NomeProduto);
        }

        [Fact]
        public async Task DeletarAsync_DeveRemoverProduto()
        {
            // Arrange
            var contexto = ObterDbContextEmMemoria("BancoTeste_Delete");
            var repositorio = ObterProdutoRepositoryComLogger(contexto);
            var produto = new Quimico
            {
                Id = 1,
                NomeProduto = "Produto a Ser Removido",
                Quantidade = 10,
                QuantidadeMinima = 5,
                LocalizacaoProduto = "Prateleira D",
                Status = StatusProduto.Disponivel,
                UnidadeMedida = UnidadeMedida.Litro,
                Cor = Cor.Incolor,
                Grupo = Grupo.Acido,
                Odor = Odor.Inodoro
            };
            await repositorio.AddAsync(produto);

            // Act
            await repositorio.DeleteAsync(1);
            var resultado = await repositorio.GetByIdAsync(1);

            // Assert
            Assert.Null(resultado);
        }

    }
}
