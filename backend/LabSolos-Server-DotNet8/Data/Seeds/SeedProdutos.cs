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
                Id = 1,
                DataRealizacao = DateTime.UtcNow.AddDays(-10),
                DataDevolucao = DateTime.UtcNow.AddDays(10),
                DataAprovacao = DateTime.UtcNow.AddDays(-9),
                Status = StatusEmprestimo.Aprovado,
                SolicitanteId = 3,
                AprovadorId = 2
            };

            var emprestimo2 = new Emprestimo
            {
                Id = 2,
                DataRealizacao = DateTime.UtcNow.AddDays(-5),
                DataDevolucao = DateTime.UtcNow.AddDays(5),
                Status = StatusEmprestimo.Pendente,
                SolicitanteId = 4
            };

            var emprestimo3 = new Emprestimo
            {
                Id = 3,
                DataRealizacao = DateTime.UtcNow.AddDays(-2),
                DataDevolucao = DateTime.UtcNow.AddDays(6),
                Status = StatusEmprestimo.Aprovado,
                SolicitanteId = 5,
                AprovadorId = 1
            };

            context.Emprestimos.AddRange(emprestimo1, emprestimo2, emprestimo3);

            // Criando lotes para diferentes tipos de produtos
            var loteQuimico = new Lote { Id = 1, CodigoLote = "LQ002", DataEntrada = DateTime.Now.AddDays(-45) };
            var loteVidraria = new Lote { Id = 2, CodigoLote = "LV002", DataEntrada = DateTime.Now.AddDays(-90) };
            var loteEquipamento = new Lote { Id = 3, CodigoLote = "LE001", DataEntrada = DateTime.Now.AddDays(-30) };

            context.Lotes.AddRange(loteQuimico, loteVidraria, loteEquipamento);

            // Criando novos produtos químicos
            var quimico1 = new Quimico
            {
                Id = 1,
                NomeProduto = "Ácido Clorídrico",
                Tipo = TipoProduto.Quimico,
                Fornecedor = "Fornecedor Químico ABC",
                Quantidade = 150,
                QuantidadeMinima = 20,
                DataValidade = DateTime.Now.AddYears(1),
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
                Id = 2,
                NomeProduto = "Sulfato de Cobre",
                Tipo = TipoProduto.Quimico,
                Fornecedor = "Fornecedor Químico XYZ",
                Quantidade = 500,
                QuantidadeMinima = 50,
                DataValidade = DateTime.Now.AddYears(2),
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
                Id = 3,
                NomeProduto = "Pipeta Graduada 10ml",
                Tipo = TipoProduto.Vidraria,
                Fornecedor = "Fornecedor Vidraria LMN",
                Quantidade = 100,
                QuantidadeMinima = 20,
                LocalizacaoProduto = "Armário Pipetas",
                Status = StatusProduto.Disponivel,
                Material = MaterialVidraria.VidroBorossilicato,
                Formato = FormatoVidraria.Cilindrica,
                Altura = AlturaVidraria.Intermediaria,
                Capacidade = 10,
                Graduada = true,
                LoteId = loteVidraria.Id
            };

            var vidraria2 = new Vidraria
            {
                Id = 4,
                NomeProduto = "Erlenmeyer 250ml",
                Tipo = TipoProduto.Vidraria,
                Fornecedor = "Fornecedor Vidraria ABC",
                Quantidade = 60,
                QuantidadeMinima = 10,
                LocalizacaoProduto = "Armário Vidraria",
                Status = StatusProduto.Disponivel,
                Material = MaterialVidraria.VidroBorossilicato,
                Formato = FormatoVidraria.Conica,
                Altura = AlturaVidraria.Alta,
                Capacidade = 250,
                Graduada = true,
                LoteId = loteVidraria.Id
            };

            context.Vidrarias.AddRange(vidraria1, vidraria2);

            var outro1 = new Produto
            {
                Id = 5,
                NomeProduto = "Luvas de Proteção",
                Tipo = TipoProduto.Outro, // Certificando que não é Químico nem Vidraria
                Fornecedor = "Fornecedor de Equipamentos ABC",
                Quantidade = 100,
                QuantidadeMinima = 10,
                LocalizacaoProduto = "Armário de EPIs",
                Status = StatusProduto.Disponivel
            };

            context.Produtos.Add(outro1);

            context.SaveChanges();

            // Criando relações Many-to-Many via EmprestimoProduto
            var emprestimoProdutos = new List<EmprestimoProduto>
            {
                new() { Id = 1, ProdutoId = quimico1.Id, EmprestimoId = emprestimo1.Id, Quantidade = 100 },
                new() { Id = 2, ProdutoId = quimico2.Id, EmprestimoId = emprestimo2.Id, Quantidade = 50 },
                new() { Id = 3, ProdutoId = vidraria1.Id, EmprestimoId = emprestimo1.Id, Quantidade = 10 },
                new() { Id = 4, ProdutoId = vidraria2.Id, EmprestimoId = emprestimo3.Id, Quantidade = 5 }
            };

            context.EmprestimoProdutos.AddRange(emprestimoProdutos);
            context.SaveChanges();
        }
    }
}
