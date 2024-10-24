using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Data.Seeds;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Data.Context
{
    public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
    {
        public DbSet<Produto> Produtos { get; set; }
        public DbSet<Quimico> Quimicos { get; set; }
        public DbSet<Vidraria> Vidrarias { get; set; }
        public DbSet<Lote> Lotes { get; set; }  
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuração de herança - Produto sendo a classe base de Quimico e Vidraria
            modelBuilder.Entity<Produto>()
                .HasDiscriminator<TipoProduto>("Tipo")
                .HasValue<Quimico>(TipoProduto.Quimico)
                .HasValue<Vidraria>(TipoProduto.Vidraria);

            // Configuração da relação entre Produto e Lote 
            modelBuilder.Entity<Produto>()
                .HasOne(p => p.Lote)
                .WithMany(l => l.Produtos)
                .HasForeignKey(p => p.LoteId)
                .OnDelete(DeleteBehavior.SetNull);  
        }
    }
}
