using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

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
        public DbSet<Notificacao> Notificacoes { get; set; }
        public DbSet<LogAuditoria> LogsAuditoria { get; set; }
        public DbSet<AuthenticationThrottleBucket> AuthenticationThrottleBuckets { get; set; }
        public DbSet<AuthenticationProtectionCapacity> AuthenticationProtectionCapacities { get; set; }
        public DbSet<PasswordRecoveryJob> PasswordRecoveryJobs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuração de herança para Usuario
            modelBuilder.Entity<Usuario>()
                .HasDiscriminator<TipoUsuario>("TipoUsuario")
                .HasValue<Administrador>(TipoUsuario.Administrador)
                .HasValue<Academico>(TipoUsuario.Academico)
                .HasValue<Usuario>(TipoUsuario.Comum);

            modelBuilder.Entity<Usuario>()
                .Property(u => u.ExigeTrocaSenha)
                .HasDefaultValue(false)
                .IsRequired();

            modelBuilder.Entity<Usuario>()
                .Property(u => u.VersaoSessao)
                .HasDefaultValue(0L)
                .IsRequired()
                .IsConcurrencyToken();

            modelBuilder.Entity<Usuario>()
                .Property(u => u.TokenRedefinicaoHash)
                .HasColumnName("TokenRedefinicaoHash");

            modelBuilder.Entity<Usuario>()
                .HasIndex(u => u.Email)
                .IsUnique()
                .HasDatabaseName("IX_Usuarios_Email");

            modelBuilder.Entity<Usuario>()
                .Property(u => u.DataIngresso)
                .HasColumnType("date");

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

            modelBuilder.Entity<AuthenticationThrottleBucket>(entity =>
            {
                entity.ToTable("AuthenticationThrottleBuckets", table =>
                {
                    table.HasCheckConstraint(
                        "CK_AuthenticationThrottleBuckets_KeyHash_Length",
                        "octet_length(\"KeyHash\") = 32");
                    table.HasCheckConstraint(
                        "CK_AuthenticationThrottleBuckets_Count_NonNegative",
                        "\"Count\" >= 0");
                    table.HasCheckConstraint(
                        "CK_AuthenticationThrottleBuckets_Window",
                        "\"WindowEndsAt\" > \"WindowStartedAt\"");
                });
                entity.HasKey(bucket => new { bucket.Scope, bucket.KeyHash });
                entity.Property(bucket => bucket.Scope).HasMaxLength(64).IsRequired();
                entity.Property(bucket => bucket.KeyHash).HasMaxLength(32).IsRequired();
                entity.Property(bucket => bucket.WindowStartedAt).IsRequired();
                entity.Property(bucket => bucket.WindowEndsAt).IsRequired();
                entity.Property(bucket => bucket.Count).IsRequired();
                entity.HasIndex(bucket => new
                    {
                        bucket.WindowEndsAt,
                        bucket.NextAllowedAt,
                        bucket.NextEmissionAt
                    })
                    .HasDatabaseName("IX_AuthenticationThrottleBuckets_Cleanup");
            });

            modelBuilder.Entity<AuthenticationProtectionCapacity>(entity =>
            {
                entity.ToTable("AuthenticationProtectionCapacity", table =>
                    table.HasCheckConstraint(
                        "CK_AuthenticationProtectionCapacity_Allocated_NonNegative",
                        "\"Allocated\" >= 0"));
                entity.HasKey(capacity => capacity.Scope);
                entity.Property(capacity => capacity.Scope).HasMaxLength(64).IsRequired();
                entity.Property(capacity => capacity.Allocated).IsRequired();
                entity.HasData(
                    new AuthenticationProtectionCapacity { Scope = AuthenticationProtectionCapacity.LoginAccount },
                    new AuthenticationProtectionCapacity { Scope = AuthenticationProtectionCapacity.LoginIp },
                    new AuthenticationProtectionCapacity { Scope = AuthenticationProtectionCapacity.RecoveryRequestRecipient },
                    new AuthenticationProtectionCapacity { Scope = AuthenticationProtectionCapacity.RecoveryRequestIp },
                    new AuthenticationProtectionCapacity { Scope = AuthenticationProtectionCapacity.RecoveryCodeRecipient },
                    new AuthenticationProtectionCapacity { Scope = AuthenticationProtectionCapacity.RecoveryCodeIp },
                    new AuthenticationProtectionCapacity { Scope = AuthenticationProtectionCapacity.RecoveryJobs });
            });

            modelBuilder.Entity<PasswordRecoveryJob>(entity =>
            {
                entity.ToTable("PasswordRecoveryJobs", table =>
                {
                    table.HasCheckConstraint(
                        "CK_PasswordRecoveryJobs_Hash_Lengths",
                        "octet_length(\"DeliveryKeyHash\") = 32 AND octet_length(\"RecipientKeyHash\") = 32");
                    table.HasCheckConstraint(
                        "CK_PasswordRecoveryJobs_Nonce_Length",
                        "octet_length(\"PayloadNonce\") = 12");
                    table.HasCheckConstraint(
                        "CK_PasswordRecoveryJobs_Tag_Length",
                        "octet_length(\"PayloadTag\") = 16");
                    table.HasCheckConstraint(
                        "CK_PasswordRecoveryJobs_Status",
                        "\"Status\" IN ('Pending', 'Processing', 'Completed', 'Cancelled', 'Failed')");
                    table.HasCheckConstraint(
                        "CK_PasswordRecoveryJobs_Attempts",
                        "\"Attempts\" BETWEEN 0 AND 3");
                    table.HasCheckConstraint(
                        "CK_PasswordRecoveryJobs_Lease_Pair",
                        "(\"LeaseId\" IS NULL) = (\"LeaseUntil\" IS NULL)");
                    table.HasCheckConstraint(
                        "CK_PasswordRecoveryJobs_Expiry",
                        "\"ExpiresAt\" > \"CreatedAt\"");
                    table.HasCheckConstraint(
                        "CK_PasswordRecoveryJobs_SessionVersion",
                        "\"SessionVersion\" IS NULL OR \"SessionVersion\" >= 0");
                });
                entity.HasKey(job => job.Id);
                entity.Property(job => job.Id).ValueGeneratedNever();
                entity.Property(job => job.DeliveryKeyHash).HasMaxLength(32).IsRequired();
                entity.Property(job => job.RecipientKeyHash).HasMaxLength(32).IsRequired();
                entity.Property(job => job.PayloadCiphertext).IsRequired();
                entity.Property(job => job.PayloadNonce).HasMaxLength(12).IsRequired();
                entity.Property(job => job.PayloadTag).HasMaxLength(16).IsRequired();
                entity.Property(job => job.EncryptionKeyId).HasMaxLength(128).IsRequired();
                entity.Property(job => job.CreatedAt).IsRequired();
                entity.Property(job => job.ExpiresAt).IsRequired();
                entity.Property(job => job.NextAttemptAt).IsRequired();
                entity.Property(job => job.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
                entity.Property(job => job.Attempts).IsRequired();
                entity.HasIndex(job => new { job.Status, job.NextAttemptAt, job.LeaseUntil })
                    .HasDatabaseName("IX_PasswordRecoveryJobs_Selection");
                entity.HasIndex(job => job.DeliveryKeyHash)
                    .IsUnique()
                    .HasFilter("\"Status\" IN ('Pending', 'Processing')")
                    .HasDatabaseName("UX_PasswordRecoveryJobs_ActiveDeliveryKey");
                entity.HasOne(job => job.User)
                    .WithMany()
                    .HasForeignKey(job => job.UserId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // Configuração do relacionamento entre Notificacao e Usuario
            modelBuilder.Entity<Notificacao>()
                .HasOne(n => n.Usuario)
                .WithMany()
                .HasForeignKey(n => n.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configuração de índices para performance
            modelBuilder.Entity<Notificacao>()
                .HasIndex(n => n.UsuarioId);

            modelBuilder.Entity<Notificacao>()
                .HasIndex(n => n.Lida);

            modelBuilder.Entity<Notificacao>()
                .HasIndex(n => n.DataCriacao);

            // Configuração do relacionamento entre LogAuditoria e Usuario
            modelBuilder.Entity<LogAuditoria>()
                .HasOne(l => l.Usuario)
                .WithMany()
                .HasForeignKey(l => l.UsuarioId)
                .OnDelete(DeleteBehavior.SetNull);

            // Configuração de índices para LogAuditoria para performance e análise
            modelBuilder.Entity<LogAuditoria>()
                .HasIndex(l => l.UsuarioId);

            modelBuilder.Entity<LogAuditoria>()
                .HasIndex(l => l.DataHora);

            modelBuilder.Entity<LogAuditoria>()
                .HasIndex(l => l.TipoAcao);

            modelBuilder.Entity<LogAuditoria>()
                .HasIndex(l => l.NivelRisco);

            modelBuilder.Entity<LogAuditoria>()
                .HasIndex(l => l.Suspeita);

            modelBuilder.Entity<LogAuditoria>()
                .HasIndex(l => l.EnderecoIP);

            // Índice composto para consultas de auditoria mais eficientes
            modelBuilder.Entity<LogAuditoria>()
                .HasIndex(l => new { l.DataHora, l.UsuarioId, l.TipoAcao });
        }
    }

    public sealed class DesignTimeAppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
    {
        public AppDbContext CreateDbContext(string[] args)
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseNpgsql("Host=localhost;Database=labsolos_design;Username=postgres")
                .Options;

            return new AppDbContext(options);
        }
    }
}
