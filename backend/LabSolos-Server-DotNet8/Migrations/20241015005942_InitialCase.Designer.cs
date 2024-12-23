﻿// <auto-generated />
using System;
using LabSolos_Server_DotNet8.Data.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

#nullable disable

namespace LabSolos_Server_DotNet8.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20241015005942_InitialCase")]
    partial class InitialCase
    {
        /// <inheritdoc />
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder.HasAnnotation("ProductVersion", "8.0.10");

            modelBuilder.Entity("LabSolos_Server_DotNet8.Models.Lote", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("INTEGER");

                    b.Property<string>("CodigoLote")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<DateTime?>("DataEntrada")
                        .HasColumnType("TEXT");

                    b.HasKey("Id");

                    b.ToTable("Lotes");

                    b.HasData(
                        new
                        {
                            Id = 1,
                            CodigoLote = "LQ001",
                            DataEntrada = new DateTime(2024, 9, 14, 21, 59, 41, 847, DateTimeKind.Local).AddTicks(9573)
                        },
                        new
                        {
                            Id = 2,
                            CodigoLote = "LV001",
                            DataEntrada = new DateTime(2024, 8, 15, 21, 59, 41, 847, DateTimeKind.Local).AddTicks(9613)
                        });
                });

            modelBuilder.Entity("LabSolos_Server_DotNet8.Models.Produto", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("INTEGER");

                    b.Property<DateTime?>("DataFabricacao")
                        .HasColumnType("TEXT");

                    b.Property<DateTime?>("DataValidade")
                        .HasColumnType("TEXT");

                    b.Property<string>("Fornecedor")
                        .HasColumnType("TEXT");

                    b.Property<string>("LocalizacaoProduto")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<int?>("LoteId")
                        .HasColumnType("INTEGER");

                    b.Property<string>("NomeProduto")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<double>("Quantidade")
                        .HasColumnType("REAL");

                    b.Property<double>("QuantidadeMinima")
                        .HasColumnType("REAL");

                    b.Property<int>("Status")
                        .HasColumnType("INTEGER");

                    b.Property<int>("Tipo")
                        .HasColumnType("INTEGER");

                    b.Property<DateTime>("UltimaModificacao")
                        .HasColumnType("TEXT");

                    b.HasKey("Id");

                    b.HasIndex("LoteId");

                    b.ToTable("Produtos");

                    b.HasDiscriminator<int>("Tipo");

                    b.UseTphMappingStrategy();
                });

            modelBuilder.Entity("LabSolos_Server_DotNet8.Models.Quimico", b =>
                {
                    b.HasBaseType("LabSolos_Server_DotNet8.Models.Produto");

                    b.Property<string>("Catmat")
                        .HasColumnType("TEXT");

                    b.Property<int>("Cor")
                        .HasColumnType("INTEGER");

                    b.Property<float?>("Densidade")
                        .HasColumnType("REAL");

                    b.Property<int?>("EstadoFisico")
                        .HasColumnType("INTEGER");

                    b.Property<string>("FormulaQuimica")
                        .HasColumnType("TEXT");

                    b.Property<string>("GrauPureza")
                        .HasColumnType("TEXT");

                    b.Property<int>("Grupo")
                        .HasColumnType("INTEGER");

                    b.Property<int>("Odor")
                        .HasColumnType("INTEGER");

                    b.Property<float?>("PesoMolecular")
                        .HasColumnType("REAL");

                    b.Property<int>("UnidadeMedida")
                        .HasColumnType("INTEGER");

                    b.HasDiscriminator().HasValue(0);

                    b.HasData(
                        new
                        {
                            Id = 1,
                            DataValidade = new DateTime(2025, 10, 14, 21, 59, 41, 847, DateTimeKind.Local).AddTicks(9619),
                            LocalizacaoProduto = "Prateleira A",
                            LoteId = 1,
                            NomeProduto = "Ácido Sulfúrico",
                            Quantidade = 200.0,
                            QuantidadeMinima = 50.0,
                            Status = 0,
                            Tipo = 0,
                            UltimaModificacao = new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                            Catmat = "Q1234",
                            Cor = 0,
                            Densidade = 1.84f,
                            EstadoFisico = 1,
                            FormulaQuimica = "H2SO4",
                            GrauPureza = "98%",
                            Grupo = 0,
                            Odor = 1,
                            PesoMolecular = 98.079f,
                            UnidadeMedida = 1
                        },
                        new
                        {
                            Id = 2,
                            DataValidade = new DateTime(2026, 10, 14, 21, 59, 41, 847, DateTimeKind.Local).AddTicks(9634),
                            LocalizacaoProduto = "Prateleira B",
                            LoteId = 1,
                            NomeProduto = "Cloreto de Sódio",
                            Quantidade = 300.0,
                            QuantidadeMinima = 30.0,
                            Status = 0,
                            Tipo = 0,
                            UltimaModificacao = new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                            Catmat = "Q5678",
                            Cor = 1,
                            Densidade = 2.16f,
                            EstadoFisico = 0,
                            FormulaQuimica = "NaCl",
                            GrauPureza = "P.A.",
                            Grupo = 3,
                            Odor = 0,
                            PesoMolecular = 58.44f,
                            UnidadeMedida = 3
                        });
                });

            modelBuilder.Entity("LabSolos_Server_DotNet8.Models.Vidraria", b =>
                {
                    b.HasBaseType("LabSolos_Server_DotNet8.Models.Produto");

                    b.Property<int>("Altura")
                        .HasColumnType("INTEGER");

                    b.Property<double?>("Capacidade")
                        .HasColumnType("REAL");

                    b.Property<int>("Formato")
                        .HasColumnType("INTEGER");

                    b.Property<bool?>("Graduada")
                        .HasColumnType("INTEGER");

                    b.Property<int>("Material")
                        .HasColumnType("INTEGER");

                    b.HasDiscriminator().HasValue(1);

                    b.HasData(
                        new
                        {
                            Id = 3,
                            LocalizacaoProduto = "Armário Vidraria",
                            LoteId = 2,
                            NomeProduto = "Béquer Borossilicato 500ml",
                            Quantidade = 50.0,
                            QuantidadeMinima = 10.0,
                            Status = 0,
                            Tipo = 1,
                            UltimaModificacao = new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                            Altura = 0,
                            Capacidade = 500.0,
                            Formato = 0,
                            Graduada = true,
                            Material = 0
                        },
                        new
                        {
                            Id = 4,
                            LocalizacaoProduto = "Armário Vidraria",
                            LoteId = 2,
                            NomeProduto = "Recipiente Polipropileno 1L",
                            Quantidade = 30.0,
                            QuantidadeMinima = 5.0,
                            Status = 0,
                            Tipo = 1,
                            UltimaModificacao = new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                            Altura = 2,
                            Capacidade = 1000.0,
                            Formato = 1,
                            Graduada = false,
                            Material = 3
                        });
                });

            modelBuilder.Entity("LabSolos_Server_DotNet8.Models.Produto", b =>
                {
                    b.HasOne("LabSolos_Server_DotNet8.Models.Lote", "Lote")
                        .WithMany("Produtos")
                        .HasForeignKey("LoteId")
                        .OnDelete(DeleteBehavior.SetNull);

                    b.Navigation("Lote");
                });

            modelBuilder.Entity("LabSolos_Server_DotNet8.Models.Lote", b =>
                {
                    b.Navigation("Produtos");
                });
#pragma warning restore 612, 618
        }
    }
}
