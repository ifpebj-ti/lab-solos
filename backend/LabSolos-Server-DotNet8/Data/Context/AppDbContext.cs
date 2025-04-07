using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
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
        public DbSet<ProdutoEmprestado> ProdutosEmprestados { get; set; }  // Adicionando a tabela intermediária

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuração de herança para Usuario
            modelBuilder.Entity<Usuario>()
                .HasDiscriminator<TipoUsuario>("TipoUsuario")
                .HasValue<Administrador>(TipoUsuario.Administrador)
                .HasValue<Academico>(TipoUsuario.Academico)
                .HasValue<Usuario>(TipoUsuario.Comum);

            // Relacionamento mentor-mentorandos (Responsável e Dependentes)
            modelBuilder.Entity<Usuario>()
                .HasMany(u => u.Dependentes)
                .WithOne(u => u.Responsavel)
                .HasForeignKey(u => u.ResponsavelId)
                .OnDelete(DeleteBehavior.Restrict);

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

            // **Configuração da relação Many-to-Many entre Emprestimo e Produto**
            modelBuilder.Entity<ProdutoEmprestado>()
                .HasKey(ep => new { ep.EmprestimoId, ep.ProdutoId });

            modelBuilder.Entity<ProdutoEmprestado>()
                .HasOne(ep => ep.Emprestimo)
                .WithMany(e => e.Produtos)
                .HasForeignKey(ep => ep.EmprestimoId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProdutoEmprestado>()
                .HasOne(ep => ep.Produto)
                .WithMany(p => p.ProdutoEmprestado)
                .HasForeignKey(ep => ep.ProdutoId)
                .OnDelete(DeleteBehavior.Cascade);

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