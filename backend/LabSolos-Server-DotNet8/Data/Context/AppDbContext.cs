using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Data.Seeds;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Data.Context
{
    public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
    {
        public DbSet<Administrador> Administradores { get; set; }
        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Academico> Academicos { get; set; }
        public DbSet<Produto> Produtos { get; set; }
        public DbSet<Quimico> Quimicos { get; set; }
        public DbSet<Vidraria> Vidrarias { get; set; }
        public DbSet<Emprestimo> Emprestimos { get; set; }
        public DbSet<Lote> Lotes { get; set; }  
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuração de herança para Usuario com TipoUsuario como discriminador
            modelBuilder.Entity<Usuario>()
                .HasDiscriminator<TipoUsuario>("TipoUsuario")
                .HasValue<Administrador>(TipoUsuario.Administrador) 
                .HasValue<Academico>(TipoUsuario.Academico)
                .HasValue<Usuario>(TipoUsuario.Comum);

            // Configuração de herança - Produto sendo a classe base de Quimico e Vidraria
            modelBuilder.Entity<Produto>()
                .HasDiscriminator<TipoProduto>("Tipo")
                .HasValue<Quimico>(TipoProduto.Quimico)
                .HasValue<Vidraria>(TipoProduto.Vidraria)
                .HasValue<Produto>(TipoProduto.Outro);

            // Configuração da relação entre Produto e Lote 
            modelBuilder.Entity<Produto>()
                .HasOne(p => p.Lote)
                .WithMany(l => l.Produtos)
                .HasForeignKey(p => p.LoteId)
                .OnDelete(DeleteBehavior.SetNull); 

            // Configuração de relacionamento 1:1 entre Produto e Emprestimo
            modelBuilder.Entity<Produto>()
                .HasOne(p => p.Emprestimo)
                .WithOne(e => e.Produto)
                .HasForeignKey<Emprestimo>(e => e.ProdutoId)
                .OnDelete(DeleteBehavior.Restrict);
            
            // Configuração do relacionamento entre Emprestimo e Solicitante
            modelBuilder.Entity<Emprestimo>()
                .HasOne(e => e.Solicitante)
                .WithMany(u => u.EmprestimosSolicitados)
                .HasForeignKey(e => e.SolicitanteId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configuração do relacionamento entre Emprestimo e Aprovador (opcional)
            modelBuilder.Entity<Emprestimo>()
                .HasOne(e => e.Aprovador)
                .WithMany(u => u.EmprestimosAprovados)
                .HasForeignKey(e => e.AprovadorId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
