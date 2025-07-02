using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Data.Seeds
{
    public class SeedProdutos
    {
        public static void Seed(AppDbContext context)
        {
            // Criando novos empréstimos com diferentes solicitantes e status
            var emprestimo1 = new Emprestimo
            {            
                DataRealizacao = DateTime.UtcNow.AddDays(-10),
                DataDevolucao = DateTime.UtcNow.AddDays(10),
                DataAprovacao = DateTime.UtcNow.AddDays(-9),
                Status = StatusEmprestimo.Aprovado,
                SolicitanteId = 3,
                AprovadorId = 2
            };

            var emprestimo2 = new Emprestimo
            {            
                DataRealizacao = DateTime.UtcNow.AddDays(-5),
                DataDevolucao = DateTime.UtcNow.AddDays(5),
                Status = StatusEmprestimo.Pendente,
                SolicitanteId = 4
            };

            var emprestimo3 = new Emprestimo
            {            
                DataRealizacao = DateTime.UtcNow.AddDays(-2),
                DataDevolucao = DateTime.UtcNow.AddDays(6),
                Status = StatusEmprestimo.Aprovado,
                SolicitanteId = 5,
                AprovadorId = 1
            };

            context.Emprestimos.AddRange(emprestimo1, emprestimo2, emprestimo3);
            context.SaveChanges();

            // Criando lotes para diferentes tipos de produtos
            var loteQuimico = new Lote
            {            
                CodigoLote = "LQ002",
                DataEntrada = DateTime.UtcNow.AddDays(-45),
                Fornecedor = "Fornecedor Químico XYZ",
                DataFabricacao = DateTime.UtcNow.AddDays(-30),
                DataValidade = DateTime.UtcNow.AddYears(1)
            };

            var loteVidraria = new Lote
            {            
                CodigoLote = "LV002",
                DataEntrada = DateTime.UtcNow.AddDays(-90),
                Fornecedor = "Fornecedor Vidraria ABC",
                DataFabricacao = DateTime.UtcNow.AddDays(-60),
                DataValidade = DateTime.UtcNow.AddYears(2)
            };

            context.Lotes.AddRange(loteQuimico, loteVidraria);
            context.SaveChanges();

            // Criando novos produtos químicos
            var quimico1 = new Quimico
            {            
                NomeProduto = "Ácido Clorídrico",
                Tipo = TipoProduto.Quimico,
                Fornecedor = loteQuimico.Fornecedor,
                Quantidade = 150,
                QuantidadeMinima = 20,
                DataFabricacao = loteQuimico.DataFabricacao,
                DataValidade = loteQuimico.DataValidade,
                LocalizacaoProduto = "Prateleira C",
                Status = StatusProduto.Disponivel,
                UnidadeMedida = UnidadeMedida.Mililitro,
                Cor = Cor.Incolor,
                Odor = Odor.Pungente,
                EstadoFisico = EstadoFisico.Liquido,
                FormulaQuimica = "HCl",
                PesoMolecular = 36.46f,
                Densidade = 1.18f,
                Grupo = Grupo.Acido,
                GrauPureza = "37%",
                Catmat = "Q9102",
                LoteId = loteQuimico.Id
            };

            var quimico2 = new Quimico
            {            
                NomeProduto = "Sulfato de Cobre",
                Tipo = TipoProduto.Quimico,
                Fornecedor = loteQuimico.Fornecedor,
                Quantidade = 500,
                QuantidadeMinima = 50,
                DataFabricacao = loteQuimico.DataFabricacao,
                DataValidade = loteQuimico.DataValidade,
                LocalizacaoProduto = "Prateleira D",
                Status = StatusProduto.Disponivel,
                UnidadeMedida = UnidadeMedida.Grama,
                Cor = Cor.Azul,
                Odor = Odor.Inodoro,
                EstadoFisico = EstadoFisico.Solido,
                FormulaQuimica = "CuSO4",
                PesoMolecular = 159.609f,
                Densidade = 3.6f,
                Grupo = Grupo.Sal,
                GrauPureza = "P.A.",
                Catmat = "Q6789",
                LoteId = loteQuimico.Id
            };

            context.Quimicos.AddRange(quimico1, quimico2);

            // Criando novos produtos de vidraria
            var vidraria1 = new Vidraria
            {            
                NomeProduto = "Pipeta Graduada 10ml",
                Tipo = TipoProduto.Vidraria,
                Fornecedor = loteVidraria.Fornecedor,
                Quantidade = 100,
                QuantidadeMinima = 20,
                DataFabricacao = loteVidraria.DataFabricacao,
                DataValidade = loteVidraria.DataValidade,
                LocalizacaoProduto = "Armário Pipetas",
                UnidadeMedida = UnidadeMedida.Unidade,
                Status = StatusProduto.Disponivel,
                Material = MaterialVidraria.VidroBorossilicato,
                Formato = FormatoVidraria.Cilindrica,
                Altura = AlturaVidraria.Intermediaria,
                Capacidade = 10,
                Graduada = true,
                Catmat = "V1234",
                LoteId = loteVidraria.Id
            };

            var vidraria2 = new Vidraria
            {            
                NomeProduto = "Erlenmeyer 250ml",
                Tipo = TipoProduto.Vidraria,
                Fornecedor = loteVidraria.Fornecedor,
                Quantidade = 60,
                QuantidadeMinima = 100,
                DataFabricacao = loteVidraria.DataFabricacao,
                DataValidade = loteVidraria.DataValidade,
                LocalizacaoProduto = "Armário Vidraria",
                UnidadeMedida = UnidadeMedida.Unidade,
                Status = StatusProduto.Disponivel,
                Material = MaterialVidraria.VidroBorossilicato,
                Formato = FormatoVidraria.Conica,
                Altura = AlturaVidraria.Alta,
                Capacidade = 250,
                Graduada = true,
                Catmat = "V5678",
                LoteId = loteVidraria.Id
            };

            context.Vidrarias.AddRange(vidraria1, vidraria2);

            var outro1 = new Produto
            {            
                NomeProduto = "Luvas de Proteção",
                UnidadeMedida = UnidadeMedida.Unidade,
                Tipo = TipoProduto.Outro, // Certificando que não é Químico nem Vidraria
                Fornecedor = "Fornecedor de Equipamentos ABC",
                Quantidade = 100,
                QuantidadeMinima = 200,
                LocalizacaoProduto = "Armário de EPIs",
                Status = StatusProduto.Disponivel,
                Catmat = "E1234",
                DataFabricacao = DateTime.UtcNow.AddDays(-30),
                DataValidade = DateTime.UtcNow.AddYears(2)
            };

            context.Produtos.Add(outro1);

            context.SaveChanges();

            // Criando relações Many-to-Many via EmprestimoProduto
            var emprestimoProdutos = new List<ProdutoEmprestado>
            {
                new() { ProdutoId = quimico1.Id, EmprestimoId = emprestimo1.Id, Quantidade = 100 },
                new() { ProdutoId = quimico2.Id, EmprestimoId = emprestimo2.Id, Quantidade = 50 },
                new() { ProdutoId = vidraria1.Id, EmprestimoId = emprestimo1.Id, Quantidade = 10 },
                new() { ProdutoId = vidraria2.Id, EmprestimoId = emprestimo3.Id, Quantidade = 5 }
            };

            context.ProdutosEmprestados.AddRange(emprestimoProdutos);
            context.SaveChanges();
        }
    }
}
