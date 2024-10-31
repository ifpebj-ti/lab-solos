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
    [Migration("20241031022628_AddEmprestimoRelacionamento")]
    partial class AddEmprestimoRelacionamento
    {
        /// <inheritdoc />
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder.HasAnnotation("ProductVersion", "8.0.10");

            modelBuilder.Entity("LabSolos_Server_DotNet8.Models.Emprestimo", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("INTEGER");

                    b.Property<int?>("AprovadorId")
                        .HasColumnType("INTEGER");

                    b.Property<DateTime>("DataDevolucao")
                        .HasColumnType("TEXT");

                    b.Property<DateTime>("DataRealizacao")
                        .HasColumnType("TEXT");

                    b.Property<int>("ProdutoId")
                        .HasColumnType("INTEGER");

                    b.Property<int>("SolicitanteId")
                        .HasColumnType("INTEGER");

                    b.Property<int>("Status")
                        .HasColumnType("INTEGER");

                    b.HasKey("Id");

                    b.HasIndex("AprovadorId");

                    b.HasIndex("ProdutoId")
                        .IsUnique();

                    b.HasIndex("SolicitanteId");

                    b.ToTable("Emprestimos");
                });

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

            modelBuilder.Entity("LabSolos_Server_DotNet8.Models.Usuario", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("INTEGER");

                    b.Property<DateTime>("DataIngresso")
                        .HasColumnType("TEXT");

                    b.Property<string>("Email")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<string>("NomeCompleto")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<string>("SenhaHash")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<int>("Status")
                        .HasColumnType("INTEGER");

                    b.Property<string>("Telefone")
                        .HasColumnType("TEXT");

                    b.Property<int>("TipoUsuario")
                        .HasColumnType("INTEGER");

                    b.HasKey("Id");

                    b.ToTable("Usuarios");

                    b.HasDiscriminator<int>("TipoUsuario").HasValue(3);

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
                });

            modelBuilder.Entity("LabSolos_Server_DotNet8.Models.Academico", b =>
                {
                    b.HasBaseType("LabSolos_Server_DotNet8.Models.Usuario");

                    b.Property<string>("Cidade")
                        .HasColumnType("TEXT");

                    b.Property<string>("Curso")
                        .HasColumnType("TEXT");

                    b.Property<string>("Instituição")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.HasDiscriminator().HasValue(1);
                });

            modelBuilder.Entity("LabSolos_Server_DotNet8.Models.Emprestimo", b =>
                {
                    b.HasOne("LabSolos_Server_DotNet8.Models.Usuario", "Aprovador")
                        .WithMany("EmprestimosAprovados")
                        .HasForeignKey("AprovadorId")
                        .OnDelete(DeleteBehavior.Restrict);

                    b.HasOne("LabSolos_Server_DotNet8.Models.Produto", "Produto")
                        .WithOne("Emprestimo")
                        .HasForeignKey("LabSolos_Server_DotNet8.Models.Emprestimo", "ProdutoId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("LabSolos_Server_DotNet8.Models.Usuario", "Solicitante")
                        .WithMany("EmprestimosSolicitados")
                        .HasForeignKey("SolicitanteId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.Navigation("Aprovador");

                    b.Navigation("Produto");

                    b.Navigation("Solicitante");
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

            modelBuilder.Entity("LabSolos_Server_DotNet8.Models.Produto", b =>
                {
                    b.Navigation("Emprestimo");
                });

            modelBuilder.Entity("LabSolos_Server_DotNet8.Models.Usuario", b =>
                {
                    b.Navigation("EmprestimosAprovados");

                    b.Navigation("EmprestimosSolicitados");
                });
#pragma warning restore 612, 618
        }
    }
}
