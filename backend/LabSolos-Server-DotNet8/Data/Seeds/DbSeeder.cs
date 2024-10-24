using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;
using System;

namespace LabSolos_Server_DotNet8.Data.Seeds
{
    public static class DbSeeder
    {
        public static void Seed(AppDbContext context)
        {
            // Verificar se os dados já estão populados para evitar duplicação
            if (!context.Lotes.Any())
            {
                // Lotes
                var loteQuimico1 = new Lote
                {
                    Id = 1,
                    CodigoLote = "LQ001",
                    DataEntrada = DateTime.Now.AddDays(-30),
                };

                var loteVidraria1 = new Lote
                {
                    Id = 2,
                    CodigoLote = "LV001",
                    DataEntrada = DateTime.Now.AddDays(-60),
                };

                // Adicionar os lotes ao contexto
                context.Lotes.AddRange(loteQuimico1, loteVidraria1);

                // Químicos
                var quimico1 = new Quimico
                {
                    Id = 1,
                    NomeProduto = "Ácido Sulfúrico",
                    Tipo = TipoProduto.Quimico,
                    Fornecedor = "Fornecedor Químico XYZ",
                    Quantidade = 200,
                    QuantidadeMinima = 50,
                    DataValidade = DateTime.Now.AddYears(1),
                    LocalizacaoProduto = "Prateleira A",
                    Status = StatusProduto.Disponivel,
                    UnidadeMedida = UnidadeMedida.Mililitro,
                    Cor = Cor.Incolor,
                    Odor = Odor.Pungente,
                    EstadoFisico = EstadoFisico.Liquido,
                    FormulaQuimica = "H2SO4",
                    PesoMolecular = 98.079f,
                    Densidade = 1.84f,
                    Grupo = Grupo.Acido,
                    GrauPureza = "98%",
                    Catmat = "Q1234",
                    LoteId = loteQuimico1.Id
                };

                var quimico2 = new Quimico
                {
                    Id = 2,
                    NomeProduto = "Cloreto de Sódio",
                    Tipo = TipoProduto.Quimico,
                    Fornecedor = "Fornecedor Químico XYZ",
                    Quantidade = 300,
                    QuantidadeMinima = 30,
                    DataValidade = DateTime.Now.AddYears(2),
                    LocalizacaoProduto = "Prateleira B",
                    Status = StatusProduto.Disponivel,
                    UnidadeMedida = UnidadeMedida.Grama,
                    Cor = Cor.Branco,
                    Odor = Odor.Inodoro,
                    EstadoFisico = EstadoFisico.Solido,
                    FormulaQuimica = "NaCl",
                    PesoMolecular = 58.44f,
                    Densidade = 2.16f,
                    Grupo = Grupo.Sal,
                    GrauPureza = "P.A.",
                    Catmat = "Q5678",
                    LoteId = loteQuimico1.Id
                };

                // Adicionar os químicos ao contexto
                context.Quimicos.AddRange(quimico1, quimico2);

                // Vidrarias
                var vidraria1 = new Vidraria
                {
                    Id = 3,
                    NomeProduto = "Béquer Borossilicato 500ml",
                    Tipo = TipoProduto.Vidraria,
                    Fornecedor = "Fornecedor Vidraria ABC",
                    Quantidade = 50,
                    QuantidadeMinima = 10,
                    LocalizacaoProduto = "Armário Vidraria",
                    Status = StatusProduto.Disponivel,
                    Material = MaterialVidraria.VidroBorossilicato,
                    Formato = FormatoVidraria.Cilindrica,
                    Altura = AlturaVidraria.Alta,
                    Capacidade = 500,
                    Graduada = true,
                    LoteId = loteVidraria1.Id
                };

                var vidraria2 = new Vidraria
                {
                    Id = 4,
                    NomeProduto = "Recipiente Polipropileno 1L",
                    Tipo = TipoProduto.Vidraria,
                    Fornecedor = "Fornecedor Vidraria ABC",
                    Quantidade = 30,
                    QuantidadeMinima = 5,
                    LocalizacaoProduto = "Armário Vidraria",
                    Status = StatusProduto.Disponivel,
                    Material = MaterialVidraria.Polipropileno,
                    Formato = FormatoVidraria.Conica,
                    Altura = AlturaVidraria.Baixa,
                    Capacidade = 1000,
                    Graduada = false,
                    LoteId = loteVidraria1.Id
                };

                // Adicionar as vidrarias ao contexto
                context.Vidrarias.AddRange(vidraria1, vidraria2);

                // Salvar todas as mudanças no banco de dados
                context.SaveChanges();
            }
        }
    }
}
