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
        public DbSet<MovimentacaoEstoque> MovimentacoesEstoque { get; set; }
        public DbSet<Lote> Lotes { get; set; }
        public DbSet<ProdutoEmprestado> ProdutosEmprestados { get; set; }  // Adicionando a tabela intermediária
        public DbSet<Notificacao> Notificacoes { get; set; }
        public DbSet<NotificacaoLeitura> NotificacoesLeituras { get; set; }
        public DbSet<LogAuditoria> LogsAuditoria { get; set; }
        public DbSet<AuditClassificationRevision> AuditClassificationRevisions { get; set; }
        public DbSet<AuthenticationThrottleBucket> AuthenticationThrottleBuckets { get; set; }
        public DbSet<AuthenticationProtectionCapacity> AuthenticationProtectionCapacities { get; set; }
        public DbSet<PasswordRecoveryJob> PasswordRecoveryJobs { get; set; }
        public DbSet<EmailAddressReservation> EmailAddressReservations { get; set; }
        public DbSet<EmailChangeNoticeJob> EmailChangeNoticeJobs { get; set; }
        public DbSet<SessaoAutenticacao> SessoesAutenticacao { get; set; }

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

            modelBuilder.Entity<Lote>(entity =>
            {
                entity.Property<string>("CodigoNormalizado")
                    .HasComputedColumnSql("lower(btrim(\"CodigoLote\"))", stored: true);
                entity.HasIndex("CodigoNormalizado").IsUnique()
                    .HasDatabaseName("UX_Lotes_CodigoNormalizado");
                entity.ToTable("Lotes", table => table.HasCheckConstraint(
                    "CK_Lotes_Codigo_NotBlank", "length(btrim(\"CodigoLote\")) > 0"));
            });

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
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Produto>()
                .Property(product => product.Desativado)
                .HasDefaultValue(false);

            modelBuilder.Entity<MovimentacaoEstoque>(entity =>
            {
                entity.ToTable("MovimentacoesEstoque", table =>
                    table.HasCheckConstraint(
                        "CK_MovimentacoesEstoque_Quantidade_Positive",
                        "\"Quantidade\" > 0"));
                entity.HasKey(movement => movement.Id);
                entity.Property(movement => movement.Tipo)
                    .HasConversion<string>()
                    .HasMaxLength(32)
                    .IsRequired();
                entity.Property(movement => movement.Quantidade).IsRequired();
                entity.Property(movement => movement.Instante).IsRequired();
                entity.HasIndex(movement => new
                    {
                        movement.EmprestimoId,
                        movement.ProdutoId,
                        movement.Tipo
                    })
                    .IsUnique()
                    .HasDatabaseName("UX_MovimentacoesEstoque_Emprestimo_Produto_Tipo");
                entity.HasOne(movement => movement.Emprestimo)
                    .WithMany()
                    .HasForeignKey(movement => movement.EmprestimoId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(movement => movement.Produto)
                    .WithMany()
                    .HasForeignKey(movement => movement.ProdutoId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(movement => movement.Ator)
                    .WithMany()
                    .HasForeignKey(movement => movement.AtorId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(movement => movement.Lote)
                    .WithMany()
                    .HasForeignKey(movement => movement.LoteId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

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
                    new AuthenticationProtectionCapacity { Scope = AuthenticationProtectionCapacity.PasswordChange },
                    new AuthenticationProtectionCapacity { Scope = AuthenticationProtectionCapacity.NotificationManualAdministrator },
                    new AuthenticationProtectionCapacity { Scope = AuthenticationProtectionCapacity.NotificationAutomaticService },
                    new AuthenticationProtectionCapacity { Scope = AuthenticationProtectionCapacity.AuditQueryAdministrator },
                    new AuthenticationProtectionCapacity { Scope = AuthenticationProtectionCapacity.AuditExportAdministrator },
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

            modelBuilder.Entity<EmailAddressReservation>(entity =>
            {
                entity.ToTable("EmailAddressReservations", table =>
                {
                    table.HasCheckConstraint(
                        "CK_EmailAddressReservations_Hash_Length",
                        "octet_length(\"NormalizedAddressHash\") = 32");
                    table.HasCheckConstraint(
                        "CK_EmailAddressReservations_Expiry",
                        "\"ExpiresAt\" > \"ReservedAt\"");
                });
                entity.HasKey(reservation => reservation.NormalizedAddressHash);
                entity.Property(reservation => reservation.NormalizedAddressHash).HasMaxLength(32).IsRequired();
                entity.Property(reservation => reservation.ReservedAt).IsRequired();
                entity.Property(reservation => reservation.ExpiresAt).IsRequired();
                entity.HasIndex(reservation => reservation.ExpiresAt)
                    .HasDatabaseName("IX_EmailAddressReservations_Expiry");
                entity.HasOne(reservation => reservation.Owner)
                    .WithMany()
                    .HasForeignKey(reservation => reservation.OwnerUserId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<EmailChangeNoticeJob>(entity =>
            {
                entity.ToTable("EmailChangeNoticeJobs", table =>
                {
                    table.HasCheckConstraint(
                        "CK_EmailChangeNoticeJobs_Hash_Lengths",
                        "octet_length(\"RecipientKeyHash\") = 32");
                    table.HasCheckConstraint(
                        "CK_EmailChangeNoticeJobs_Nonce_Length",
                        "octet_length(\"PayloadNonce\") = 12");
                    table.HasCheckConstraint(
                        "CK_EmailChangeNoticeJobs_Tag_Length",
                        "octet_length(\"PayloadTag\") = 16");
                    table.HasCheckConstraint(
                        "CK_EmailChangeNoticeJobs_Status",
                        "\"Status\" IN ('Pending', 'Processing', 'Delivered', 'Failed')");
                    table.HasCheckConstraint(
                        "CK_EmailChangeNoticeJobs_Recipient",
                        "\"Recipient\" IN ('PreviousAddress', 'NewAddress')");
                    table.HasCheckConstraint(
                        "CK_EmailChangeNoticeJobs_Attempts",
                        "\"Attempts\" BETWEEN 0 AND 3");
                    table.HasCheckConstraint(
                        "CK_EmailChangeNoticeJobs_Lease_Pair",
                        "(\"LeaseId\" IS NULL) = (\"LeaseUntil\" IS NULL)");
                    table.HasCheckConstraint(
                        "CK_EmailChangeNoticeJobs_Deadline",
                        "\"DeadlineAt\" > \"CreatedAt\" AND \"RetainUntil\" > \"CreatedAt\"");
                });
                entity.HasKey(job => job.Id);
                entity.Property(job => job.Id).ValueGeneratedNever();
                entity.Property(job => job.OperationId).IsRequired();
                entity.Property(job => job.Recipient).HasConversion<string>().HasMaxLength(32).IsRequired();
                entity.Property(job => job.RecipientKeyHash).HasMaxLength(32).IsRequired();
                entity.Property(job => job.PayloadCiphertext).IsRequired();
                entity.Property(job => job.PayloadNonce).HasMaxLength(12).IsRequired();
                entity.Property(job => job.PayloadTag).HasMaxLength(16).IsRequired();
                entity.Property(job => job.EncryptionKeyId).HasMaxLength(128).IsRequired();
                entity.Property(job => job.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
                entity.Property(job => job.LastFailureCode).HasMaxLength(64);
                entity.Property(job => job.CreatedAt).IsRequired();
                entity.Property(job => job.DeadlineAt).IsRequired();
                entity.Property(job => job.RetainUntil).IsRequired();
                entity.Property(job => job.NextAttemptAt).IsRequired();
                entity.Property(job => job.Attempts).IsRequired();
                entity.HasIndex(job => new { job.OperationId, job.Recipient }).IsUnique()
                    .HasDatabaseName("UX_EmailChangeNoticeJobs_Operation_Recipient");
                entity.HasIndex(job => new { job.Status, job.NextAttemptAt, job.DeadlineAt })
                    .HasDatabaseName("IX_EmailChangeNoticeJobs_Pending");
                entity.HasIndex(job => job.RetainUntil)
                    .HasDatabaseName("IX_EmailChangeNoticeJobs_Retention");
                entity.HasOne(job => job.User)
                    .WithMany()
                    .HasForeignKey(job => job.UserId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<SessaoAutenticacao>(entity =>
            {
                entity.ToTable("SessoesAutenticacao", table =>
                {
                    table.HasCheckConstraint("CK_SessoesAutenticacao_IdentifierHash_Length", "octet_length(\"IdentificadorHash\") = 64");
                    table.HasCheckConstraint("CK_SessoesAutenticacao_JwtIdHash_Length", "\"JwtIdHash\" IS NULL OR octet_length(\"JwtIdHash\") = 64");
                    table.HasCheckConstraint("CK_SessoesAutenticacao_SessionVersion", "\"VersaoSessao\" >= 0");
                    table.HasCheckConstraint("CK_SessoesAutenticacao_Revision", "\"Revisao\" >= 0");
                    table.HasCheckConstraint("CK_SessoesAutenticacao_Expiry", "\"ExpiraEmUtc\" > \"CriadaEmUtc\"");
                    table.HasCheckConstraint("CK_SessoesAutenticacao_Activity", "\"UltimaAtividadeEmUtc\" >= \"CriadaEmUtc\"");
                });
                entity.HasKey(session => session.Id);
                entity.Property(session => session.IdentificadorHash).HasMaxLength(64).IsRequired();
                entity.Property(session => session.JwtIdHash).HasMaxLength(64);
                entity.Property(session => session.UsuarioId).IsRequired();
                entity.Property(session => session.VersaoSessao).IsRequired();
                entity.Property(session => session.CriadaEmUtc).IsRequired();
                entity.Property(session => session.UltimaAtividadeEmUtc).IsRequired();
                entity.Property(session => session.ExpiraEmUtc).IsRequired();
                entity.Property(session => session.Revisao).IsConcurrencyToken().IsRequired();
                entity.HasIndex(session => session.IdentificadorHash)
                    .IsUnique()
                    .HasDatabaseName("UX_SessoesAutenticacao_IdentifierHash");
                entity.HasIndex(session => session.JwtIdHash)
                    .IsUnique()
                    .HasFilter("\"JwtIdHash\" IS NOT NULL")
                    .HasDatabaseName("UX_SessoesAutenticacao_JwtIdHash");
                entity.HasIndex(session => new { session.UsuarioId, session.ExpiraEmUtc })
                    .HasDatabaseName("IX_SessoesAutenticacao_User_Expiry");
                entity.HasOne(session => session.Usuario)
                    .WithMany()
                    .HasForeignKey(session => session.UsuarioId)
                    .OnDelete(DeleteBehavior.Cascade);
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

            modelBuilder.Entity<Notificacao>()
                .Property(n => n.AudienciaLegadaIndeterminada)
                .HasDefaultValue(false)
                .IsRequired();

            modelBuilder.Entity<NotificacaoLeitura>(entity =>
            {
                entity.ToTable("NotificacoesLeituras", table =>
                    table.HasCheckConstraint("CK_NotificacoesLeituras_UserId_Positive", "\"UsuarioId\" > 0"));
                entity.HasKey(read => new { read.NotificacaoId, read.UsuarioId });
                entity.Property(read => read.Lida).IsRequired();
                entity.HasIndex(read => new { read.UsuarioId, read.Lida, read.NotificacaoId })
                    .HasDatabaseName("IX_NotificacoesLeituras_Usuario_Lida_Notificacao");
                entity.HasOne(read => read.Notificacao)
                    .WithMany(notification => notification.Destinatarios)
                    .HasForeignKey(read => read.NotificacaoId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Notificacao>(entity =>
            {
                entity.Property(notification => notification.ChaveIdempotencia)
                    .HasMaxLength(200);
                entity.Property(notification => notification.ExcluidaEmUtc);
                entity.HasIndex(notification => notification.ChaveIdempotencia)
                    .IsUnique()
                    .HasFilter("\"ChaveIdempotencia\" IS NOT NULL")
                    .HasDatabaseName("IX_Notificacoes_ChaveIdempotencia");
            });

            // Configuração do relacionamento entre LogAuditoria e Usuario
            modelBuilder.Entity<LogAuditoria>()
                .HasOne(l => l.Usuario)
                .WithMany()
                .HasForeignKey(l => l.UsuarioId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<LogAuditoria>(entity =>
            {
                entity.ToTable("LogsAuditoria", table =>
                {
                    table.HasCheckConstraint(
                        "CK_LogsAuditoria_ActorProvenance",
                        "(\"OrigemConfiavel\" = 'UsuarioAutenticado' AND \"ReferenciaAtor\" LIKE 'usuario:%') OR " +
                        "(\"OrigemConfiavel\" = 'ProcessoAutorizado' AND \"ReferenciaAtor\" LIKE 'processo:%' AND \"UsuarioId\" IS NULL) OR " +
                        "(\"OrigemConfiavel\" = 'SemAtorValido' AND \"ReferenciaAtor\" IS NULL AND \"UsuarioId\" IS NULL)");
                    table.HasCheckConstraint(
                        "CK_LogsAuditoria_Expiry",
                        "\"ExpiraEmUtc\" > \"DataHora\"");
                      table.HasCheckConstraint(
                          "CK_LogsAuditoria_DetectionRuleMetadata",
                          "(\"CodigoRegraDeteccao\" IS NULL AND \"VersaoRegraDeteccao\" IS NULL AND \"QuantidadeObservadaDeteccao\" IS NULL) OR " +
                          "(\"CodigoRegraDeteccao\" IS NOT NULL AND length(btrim(\"CodigoRegraDeteccao\")) > 0 AND \"VersaoRegraDeteccao\" > 0 AND \"QuantidadeObservadaDeteccao\" > 0 AND \"CategoriaDeteccao\" = 'AtividadeSuspeita')");
                });
                entity.Property(log => log.CodigoEvento).HasConversion<string>().HasMaxLength(50).IsRequired();
                entity.Property(log => log.OrigemConfiavel).HasConversion<string>().HasMaxLength(32).IsRequired();
                entity.Property(log => log.ReferenciaAtor).HasMaxLength(128);
                entity.Property(log => log.Resultado).HasConversion<string>().HasMaxLength(32).IsRequired();
                entity.Property(log => log.CategoriaRegistro).HasConversion<string>().HasMaxLength(32).IsRequired();
                entity.Property(log => log.CorrelationId).HasMaxLength(64).IsRequired();
                entity.Property(log => log.ExpiraEmUtc).IsRequired();
                entity.Property(log => log.RevisaoClassificacao)
                    .HasDefaultValue(0)
                    .IsConcurrencyToken()
                    .IsRequired();
                  entity.Property(log => log.CategoriaDeteccao)
                      .HasConversion<string>()
                      .HasMaxLength(32)
                      .IsRequired();
                  entity.Property(log => log.CodigoRegraDeteccao).HasMaxLength(64);
                entity.HasIndex(log => log.Recurso)
                    .IsUnique()
                    .HasFilter("\"CodigoEvento\" = 'DevolucaoEmprestimo' AND \"CategoriaRegistro\" = 'TrilhaObrigatoria'")
                    .HasDatabaseName("UX_LogsAuditoria_DevolucaoEmprestimo_Recurso");
                entity.HasIndex(log => log.ExpiraEmUtc).HasDatabaseName("IX_LogsAuditoria_ExpiraEmUtc");
            });

            modelBuilder.Entity<AuditClassificationRevision>(entity =>
            {
                entity.ToTable("AuditClassificationRevisions", table =>
                {
                    table.HasCheckConstraint(
                        "CK_AuditClassificationRevisions_Revision_NonNegative",
                        "\"NumeroRevisao\" >= 0");
                    table.HasCheckConstraint(
                        "CK_AuditClassificationRevisions_Origin_Actor",
                        "(\"Origem\" = 'LegadoObservado' AND \"AutorUsuarioId\" IS NULL) OR " +
                        "(\"Origem\" = 'RevisaoManual' AND \"AutorUsuarioId\" > 0)");
                });
                entity.HasKey(revision => revision.Id);
                entity.Property(revision => revision.NumeroRevisao).IsRequired();
                entity.Property(revision => revision.SuspeitaAnterior).IsRequired();
                entity.Property(revision => revision.SuspeitaResultante).IsRequired();
                entity.Property(revision => revision.Justificativa).HasMaxLength(1000).IsRequired();
                entity.Property(revision => revision.CriadaEmUtc).IsRequired();
                entity.Property(revision => revision.Origem)
                    .HasConversion<string>()
                    .HasMaxLength(32)
                    .IsRequired();
                entity.HasIndex(revision => new { revision.LogAuditoriaId, revision.NumeroRevisao })
                    .IsUnique()
                    .HasDatabaseName("UX_AuditClassificationRevisions_Log_Revision");
                entity.HasOne(revision => revision.LogAuditoria)
                    .WithMany(log => log.RevisoesClassificacao)
                    .HasForeignKey(revision => revision.LogAuditoriaId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

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
