using AutoMapper;
using System.Security.Cryptography;
using System.Text;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
using LabSolos_Server_DotNet8.DTOs.Notificacoes;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace LabSolos_Server_DotNet8.Services
{
    public sealed class NotificationRecipientNotEligibleException()
        : ArgumentException("Os destinatários informados não são elegíveis para esta notificação.");

    public interface INotificacaoService
    {
        Task<IEnumerable<NotificacaoDTO>> ObterNotificacoesUsuarioAsync(int usuarioId, bool apenasNaoLidas = false);
        Task<NotificacaoDTO?> ObterNotificacaoDestinatarioAsync(int notificacaoId, int usuarioId);
        Task<int> ContarNaoLidasUsuarioAsync(int usuarioId);
        Task<NotificacaoDTO?> CriarNotificacaoAsync(CreateNotificacaoDTO createDto);
        Task<NotificacaoDTO> CriarNotificacaoManualAsync(CreateNotificacaoDTO createDto, int administradorId);
        Task<bool> ExcluirNotificacaoAsync(int notificacaoId, int administradorId);
        Task<bool> MarcarComoLidaComVerificacaoAsync(int notificacaoId, int usuarioId);
        Task<int> MarcarVariasComoLidaComVerificacaoAsync(int[] notificacaoIds, int usuarioId);
        Task<bool> UsuarioPodeAcessarNotificacaoAsync(int notificacaoId, int usuarioId);
        Task CriarNotificacaoEstoqueBaixoAsync(int produtoId, string nomeProduto, int quantidadeAtual, int quantidadeMinima);
        Task CriarNotificacaoProdutoVencidoAsync(int produtoId, string nomeProduto, DateTime dataVencimento);
        Task CriarNotificacaoSolicitacaoCadastroAsync(int usuarioId, string nomeUsuario);
        Task CriarNotificacaoSolicitacaoEmprestimoAsync(int emprestimoId, string solicitante);
        Task CriarNotificacaoNovoEmprestimo(int emprestimoId);
        Task CriarNotificacaoNovaSolicitacaoUsuario(int usuarioId);
        Task GerarNotificacoesAutomaticasAsync();
        Task VerificarEmprestimosVencidosAsync();
    }

    public class NotificacaoService : INotificacaoService
    {
        private static readonly Action<ILogger, TipoNotificacao, Exception?> LogAutomaticNotificationSkipped =
            LoggerMessage.Define<TipoNotificacao>(LogLevel.Information,
                new EventId(2101, nameof(LogAutomaticNotificationSkipped)),
                "Notificação automática ignorada porque não há destinatários habilitados para o tipo {Tipo}");
        private static readonly Action<ILogger, int, int, Exception?> LogNotificationsMarkedRead =
            LoggerMessage.Define<int, int>(LogLevel.Information,
                new EventId(2102, nameof(LogNotificationsMarkedRead)),
                "Marcadas {Count} notificações como lidas pelo usuário {UsuarioId}");
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<NotificacaoService> _logger;
        private readonly TimeProvider _timeProvider;
        private readonly IAuditoriaService? _auditoriaService;
        private readonly NotificationQuotaPolicy? _notificationQuotaPolicy;
        private const string AutomaticServiceIdentity = "lab-solos-notification-service";
        private static readonly HashSet<TipoNotificacao> TiposAdministrativos =
        [
            TipoNotificacao.EstoqueBaixo,
            TipoNotificacao.ProdutoVencido,
            TipoNotificacao.ProdutoProximoVencimento,
            TipoNotificacao.SolicitacaoUsuario,
            TipoNotificacao.SolicitacaoCadastro,
            TipoNotificacao.NovoEmprestimo,
            TipoNotificacao.SolicitacaoEmprestimo
        ];

        public NotificacaoService(
            IUnitOfWork uow,
            IMapper mapper,
            ILogger<NotificacaoService> logger,
            TimeProvider timeProvider,
            IAuditoriaService? auditoriaService = null,
            NotificationQuotaPolicy? notificationQuotaPolicy = null)
        {
            _uow = uow;
            _mapper = mapper;
            _logger = logger;
            _timeProvider = timeProvider;
            _auditoriaService = auditoriaService;
            _notificationQuotaPolicy = notificationQuotaPolicy;
        }

        public async Task<IEnumerable<NotificacaoDTO>> ObterNotificacoesUsuarioAsync(int usuarioId, bool apenasNaoLidas = false)
        {
            var notificacoes = await _uow.NotificacaoRepository.ObterPorDestinatarioAsync(usuarioId, apenasNaoLidas);
            return _mapper.Map<IEnumerable<NotificacaoDTO>>(notificacoes);
        }

        public async Task<NotificacaoDTO?> ObterNotificacaoDestinatarioAsync(int notificacaoId, int usuarioId)
        {
            var notificationRead = await _uow.NotificacaoRepository
                .ObterParaDestinatarioAsync(notificacaoId, usuarioId);
            return notificationRead is null ? null : _mapper.Map<NotificacaoDTO>(notificationRead);
        }

        public async Task<int> ContarNaoLidasUsuarioAsync(int usuarioId)
        {
            return await _uow.NotificacaoRepository.ContarNaoLidasPorDestinatarioAsync(usuarioId);
        }

        public Task<NotificacaoDTO?> CriarNotificacaoAsync(CreateNotificacaoDTO createDto) =>
            EmitirAutomaticamenteAsync(createDto, "notification-service");

        public Task<NotificacaoDTO> CriarNotificacaoManualAsync(
            CreateNotificacaoDTO createDto,
            int administradorId) =>
            EmitirManualmenteAsync(createDto, administradorId);

        private async Task<NotificacaoDTO> EmitirManualmenteAsync(
            CreateNotificacaoDTO createDto,
            int administradorId)
        {
            await ValidarAdministradorHabilitadoAsync(administradorId);
            EnsureMandatoryAuditAvailable();

            if (_notificationQuotaPolicy is null)
            {
                return await PersistirEmissaoAsync(
                    createDto,
                    OrigemConfiavelAuditoria.UsuarioAutenticado,
                    administradorId,
                    null,
                    null) ?? throw new InvalidOperationException("A emissão manual não produziu uma notificação.");
            }

            var attempt = await _notificationQuotaPolicy.BeginManualAsync(administradorId);
            await using (attempt)
            {
                return await PersistirEmissaoAsync(
                    createDto,
                    OrigemConfiavelAuditoria.UsuarioAutenticado,
                    administradorId,
                    null,
                    attempt) ?? throw new InvalidOperationException("A emissão manual não produziu uma notificação.");
            }
        }

        private async Task<NotificacaoDTO?> EmitirAutomaticamenteAsync(
            CreateNotificacaoDTO createDto,
            string produtor)
        {
            EnsureMandatoryAuditAvailable();
            var chaveIdempotencia = CriarChaveIdempotencia(createDto, produtor);
            if (_notificationQuotaPolicy is null)
            {
                return await PersistirEmissaoAsync(
                    createDto,
                    OrigemConfiavelAuditoria.ProcessoAutorizado,
                    null,
                    chaveIdempotencia,
                    null);
            }

            var attempt = await _notificationQuotaPolicy.BeginAutomaticAsync(AutomaticServiceIdentity);
            await using (attempt)
            {
                return await PersistirEmissaoAsync(
                    createDto,
                    OrigemConfiavelAuditoria.ProcessoAutorizado,
                    null,
                    chaveIdempotencia,
                    attempt);
            }
        }

        private async Task<NotificacaoDTO?> PersistirEmissaoAsync(
            CreateNotificacaoDTO createDto,
            OrigemConfiavelAuditoria origem,
            int? administradorId,
            string? chaveIdempotencia,
            AuthenticationThrottleAttempt? attempt)
        {
            ArgumentNullException.ThrowIfNull(createDto);
            ValidarDestino(createDto);

            if (chaveIdempotencia is not null)
            {
                if (attempt is not null)
                {
                    await _uow.NotificacaoRepository.BloquearChaveIdempotenciaAsync(chaveIdempotencia);
                }

                var existente = await _uow.NotificacaoRepository
                    .ObterPorChaveIdempotenciaAsync(chaveIdempotencia);
                if (existente is not null)
                {
                    return _mapper.Map<NotificacaoDTO>(existente);
                }
            }

            var notificacao = _mapper.Map<Notificacao>(createDto);
            notificacao.DataCriacao = _timeProvider.GetUtcNow().UtcDateTime;
            notificacao.Lida = false;
            notificacao.DataLeitura = null;
            notificacao.AudienciaLegadaIndeterminada = false;
            notificacao.ExcluidaEmUtc = null;
            notificacao.ChaveIdempotencia = chaveIdempotencia;

            var targetLevel = ResolverNivelDestinatario(createDto);
            var recipients = await _uow.NotificacaoRepository
                .ObterDestinatariosHabilitadosAsync(notificacao.UsuarioId, targetLevel);
            if (recipients.Length == 0)
            {
                if (origem == OrigemConfiavelAuditoria.ProcessoAutorizado)
                {
                    LogAutomaticNotificationSkipped(_logger, createDto.Tipo, null);
                    return null;
                }

                throw new NotificationRecipientNotEligibleException();
            }

            notificacao.Destinatarios = recipients.Select(userId => new NotificacaoLeitura
            {
                UsuarioId = userId,
                Lida = false,
                Notificacao = notificacao
            }).ToList();

            IDbContextTransaction? fallbackTransaction = null;
            try
            {
                if (attempt is null && _auditoriaService is not null)
                {
                    fallbackTransaction = await _uow.BeginTransactionAsync();
                }

                var novaNotificacao = _uow.NotificacaoRepository.Criar(notificacao);
                if (attempt is not null || fallbackTransaction is not null)
                {
                    // Save inside the still-open transaction so the audit references the generated ID.
                    await _uow.CommitAsync();
                }

                if (_auditoriaService is not null)
                {
                    await _auditoriaService.RegistrarEventoObrigatorioAsync(new CreateLogAuditoriaDTO
                    {
                        CodigoEvento = CodigoEventoAuditoria.EmissaoNotificacao,
                        OrigemConfiavel = origem,
                        Resultado = ResultadoOperacaoAuditoria.Sucesso,
                        UsuarioId = administradorId,
                        IdentidadeProcesso = origem == OrigemConfiavelAuditoria.ProcessoAutorizado
                            ? AutomaticServiceIdentity
                            : null,
                        ReferenciaRecurso = notificacao.Id.ToString(System.Globalization.CultureInfo.InvariantCulture)
                    });
                }

                if (attempt is not null)
                {
                    await attempt.CompleteAsync(AuthenticationThrottleOutcome.Accepted);
                }
                else if (fallbackTransaction is not null)
                {
                    await _uow.CommitAsync();
                    await fallbackTransaction.CommitAsync();
                }
                else
                {
                    await _uow.CommitAsync();
                }

                _logger.LogInformation("Notificação criada: {Titulo} para usuário {UsuarioId}",
                    notificacao.Titulo, notificacao.UsuarioId ?? 0);

                return _mapper.Map<NotificacaoDTO>(novaNotificacao);
            }
            catch
            {
                if (fallbackTransaction is not null)
                {
                    await fallbackTransaction.RollbackAsync(CancellationToken.None);
                }

                throw;
            }
            finally
            {
                if (fallbackTransaction is not null)
                {
                    await fallbackTransaction.DisposeAsync();
                }
            }
        }

        public async Task<bool> ExcluirNotificacaoAsync(int notificacaoId, int administradorId)
        {
            await ValidarAdministradorHabilitadoAsync(administradorId);
            if (_auditoriaService is null)
            {
                throw new InvalidOperationException("A trilha obrigatória de notificações está indisponível.");
            }

            var notification = await _uow.NotificacaoRepository
                .ObterPorIdIncluindoExcluidasAsync(notificacaoId);
            if (notification is null)
            {
                return false;
            }

            if (notification.ExcluidaEmUtc is not null)
            {
                return true;
            }

            var now = _timeProvider.GetUtcNow().UtcDateTime;
            if (!await _uow.NotificacaoRepository.ExcluirLogicamenteAsync(notificacaoId, now))
            {
                return true;
            }

            await _auditoriaService.RegistrarEventoObrigatorioAsync(new CreateLogAuditoriaDTO
            {
                CodigoEvento = CodigoEventoAuditoria.ExclusaoNotificacao,
                OrigemConfiavel = OrigemConfiavelAuditoria.UsuarioAutenticado,
                Resultado = ResultadoOperacaoAuditoria.Sucesso,
                UsuarioId = administradorId,
                ReferenciaRecurso = notificacaoId.ToString(System.Globalization.CultureInfo.InvariantCulture)
            });
            await _uow.CommitAsync();
            return true;
        }

        private async Task ValidarAdministradorHabilitadoAsync(int administradorId)
        {
            var administrator = await _uow.UsuarioRepository.ObterAsync(user => user.Id == administradorId);
            if (administrator is null
                || administrator.Status != StatusUsuario.Habilitado
                || administrator.TipoUsuario != TipoUsuario.Administrador
                || administrator.NivelUsuario != NivelUsuario.Administrador)
            {
                throw new UnauthorizedAccessException("A solicitação não pode ser concluída.");
            }
        }

        private void EnsureMandatoryAuditAvailable()
        {
            if (_notificationQuotaPolicy is not null && _auditoriaService is null)
            {
                throw new InvalidOperationException("A trilha obrigatória de notificações está indisponível.");
            }
        }

        private static string? CriarChaveIdempotencia(CreateNotificacaoDTO createDto, string produtor)
        {
            if (createDto.ReferenciaId is not > 0 || string.IsNullOrWhiteSpace(createDto.TipoReferencia))
            {
                return null;
            }

            var tipoReferencia = createDto.TipoReferencia.Trim().ToLowerInvariant();
            var referenciaId = createDto.ReferenciaId.Value.ToString(System.Globalization.CultureInfo.InvariantCulture);
            var identidade = $"{produtor.Length}:{produtor}{(int)createDto.Tipo}:{tipoReferencia.Length}:{tipoReferencia}:{referenciaId}";
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(identidade));
            return $"v1:{Convert.ToHexString(hash).ToLowerInvariant()}";
        }

        private static void ValidarDestino(CreateNotificacaoDTO createDto)
        {
            ArgumentNullException.ThrowIfNull(createDto);
            if (!Enum.IsDefined(createDto.Tipo)
                || string.IsNullOrWhiteSpace(createDto.Titulo)
                || createDto.Titulo.Length > 255
                || string.IsNullOrWhiteSpace(createDto.Mensagem)
                || createDto.Mensagem.Length > 2000)
            {
                throw new ArgumentException("Os dados da notificação são inválidos.", nameof(createDto));
            }

            if (createDto.UsuarioId is not null && createDto.NivelUsuarioDestino is not null)
            {
                throw new NotificationRecipientNotEligibleException();
            }

            if (TiposAdministrativos.Contains(createDto.Tipo)
                && createDto.NivelUsuarioDestino is { } targetLevel
                && targetLevel != NivelUsuario.Administrador)
            {
                throw new NotificationRecipientNotEligibleException();
            }

            if (createDto.UsuarioId is not null && TiposAdministrativos.Contains(createDto.Tipo))
            {
                throw new NotificationRecipientNotEligibleException();
            }
        }

        public async Task<bool> MarcarComoLidaComVerificacaoAsync(int notificacaoId, int usuarioId)
        {
            var dataLeitura = _timeProvider.GetUtcNow().UtcDateTime;
            var marcada = await _uow.NotificacaoRepository
                .MarcarComoLidaAsync(notificacaoId, usuarioId, dataLeitura);
            if (!marcada)
            {
                _logger.LogWarning("Usuário {UsuarioId} tentou marcar notificação {NotificacaoId} sem permissão", usuarioId, notificacaoId);
                return false;
            }

            await _uow.CommitAsync();

            _logger.LogInformation("Notificação {NotificacaoId} marcada como lida pelo usuário {UsuarioId}", notificacaoId, usuarioId);
            return true;
        }

        public async Task<int> MarcarVariasComoLidaComVerificacaoAsync(int[] notificacaoIds, int usuarioId)
        {
            var markedCount = await _uow.NotificacaoRepository.MarcarVariasComoLidaAsync(
                notificacaoIds,
                usuarioId,
                _timeProvider.GetUtcNow().UtcDateTime);
            await _uow.CommitAsync();

            LogNotificationsMarkedRead(_logger, markedCount, usuarioId, null);
            return markedCount;
        }

        public async Task<bool> UsuarioPodeAcessarNotificacaoAsync(int notificacaoId, int usuarioId)
        {
            return await _uow.NotificacaoRepository.ObterParaDestinatarioAsync(notificacaoId, usuarioId) is not null;
        }

        private static NivelUsuario? ResolverNivelDestinatario(CreateNotificacaoDTO createDto)
        {
            if (createDto.NivelUsuarioDestino.HasValue)
            {
                return createDto.NivelUsuarioDestino;
            }

            return TiposAdministrativos.Contains(createDto.Tipo)
                ? NivelUsuario.Administrador
                : null;
        }

        public async Task CriarNotificacaoEstoqueBaixoAsync(int produtoId, string nomeProduto, int quantidadeAtual, int quantidadeMinima)
        {
            var createDto = new CreateNotificacaoDTO
            {
                Titulo = "Estoque Baixo",
                Mensagem = $"O produto '{nomeProduto}' está com estoque baixo. Quantidade atual: {quantidadeAtual}, mínima: {quantidadeMinima}.",
                Tipo = TipoNotificacao.EstoqueBaixo,
                UsuarioId = null, // Notificação global para administradores
                EhGlobal = true,
                NivelUsuarioDestino = NivelUsuario.Administrador,
                LinkAcao = "/admin/follow-up",
                ReferenciaId = produtoId,
                TipoReferencia = "Produto"
            };

            await EmitirAutomaticamenteAsync(createDto, "low-stock");
        }

        public async Task CriarNotificacaoProdutoVencidoAsync(int produtoId, string nomeProduto, DateTime dataVencimento)
        {
            var diasVencimento = (dataVencimento - DateTime.UtcNow).Days;
            var tipo = diasVencimento <= 0 ? TipoNotificacao.ProdutoVencido : TipoNotificacao.ProdutoProximoVencimento;

            var titulo = diasVencimento <= 0 ? "Produto Vencido" : "Produto Próximo ao Vencimento";
            var mensagem = diasVencimento <= 0
                ? $"O produto '{nomeProduto}' venceu em {dataVencimento:dd/MM/yyyy}."
                : $"O produto '{nomeProduto}' vence em {Math.Abs(diasVencimento)} dia(s) ({dataVencimento:dd/MM/yyyy}).";

            var createDto = new CreateNotificacaoDTO
            {
                Titulo = titulo,
                Mensagem = mensagem,
                Tipo = tipo,
                UsuarioId = null, // Notificação global para administradores
                EhGlobal = true,
                NivelUsuarioDestino = NivelUsuario.Administrador,
                LinkAcao = "/admin/follow-up",
                ReferenciaId = produtoId,
                TipoReferencia = "Produto"
            };

            await EmitirAutomaticamenteAsync(createDto, "product-expiration");
        }

        public async Task CriarNotificacaoSolicitacaoCadastroAsync(int usuarioId, string nomeUsuario)
        {
            var createDto = new CreateNotificacaoDTO
            {
                Titulo = "Nova Solicitação de Cadastro",
                Mensagem = $"O usuário '{nomeUsuario}' solicitou cadastro no sistema.",
                Tipo = TipoNotificacao.SolicitacaoCadastro,
                UsuarioId = null, // Notificação global para administradores
                EhGlobal = true,
                NivelUsuarioDestino = NivelUsuario.Administrador,
                LinkAcao = "/admin/register-request",
                ReferenciaId = usuarioId,
                TipoReferencia = "Usuario"
            };

            await EmitirAutomaticamenteAsync(createDto, "registration-request");
        }

        public async Task CriarNotificacaoSolicitacaoEmprestimoAsync(int emprestimoId, string solicitante)
        {
            var createDto = new CreateNotificacaoDTO
            {
                Titulo = "Nova Solicitação de Empréstimo",
                Mensagem = $"O usuário '{solicitante}' solicitou um novo empréstimo.",
                Tipo = TipoNotificacao.SolicitacaoEmprestimo,
                UsuarioId = null, // Notificação global para administradores
                EhGlobal = true,
                NivelUsuarioDestino = NivelUsuario.Administrador,
                LinkAcao = "/admin/loans-request",
                ReferenciaId = emprestimoId,
                TipoReferencia = "Emprestimo"
            };

            await EmitirAutomaticamenteAsync(createDto, "loan-request");
        }

        public async Task CriarNotificacaoNovoEmprestimo(int emprestimoId)
        {
            // Buscar dados do empréstimo
            var emprestimo = await _uow.EmprestimoRepository.ObterAsync(e => e.Id == emprestimoId,
                query => query.Include(e => e.Solicitante));

            if (emprestimo == null)
            {
                _logger.LogWarning($"Empréstimo com ID {emprestimoId} não encontrado para criar notificação");
                return;
            }

            var createDto = new CreateNotificacaoDTO
            {
                Titulo = "Novo Empréstimo Solicitado",
                Mensagem = $"O usuário {emprestimo.Solicitante.NomeCompleto} solicitou um novo empréstimo.",
                Tipo = TipoNotificacao.NovoEmprestimo,
                UsuarioId = null, // Notificação global para administradores
                EhGlobal = true,
                NivelUsuarioDestino = NivelUsuario.Administrador,
                LinkAcao = "/admin/loans-request",
                ReferenciaId = emprestimoId,
                TipoReferencia = "Emprestimo"
            };

            await EmitirAutomaticamenteAsync(createDto, "loan-created");
        }

        public async Task CriarNotificacaoNovaSolicitacaoUsuario(int usuarioId)
        {
            // Buscar dados do usuário
            var usuario = await _uow.UsuarioRepository.ObterAsync(u => u.Id == usuarioId);

            if (usuario == null)
            {
                _logger.LogWarning($"Usuário com ID {usuarioId} não encontrado para criar notificação");
                return;
            }

            var createDto = new CreateNotificacaoDTO
            {
                Titulo = "Nova Solicitação de Cadastro",
                Mensagem = $"O usuário {usuario.NomeCompleto} solicitou aprovação de cadastro.",
                Tipo = TipoNotificacao.SolicitacaoUsuario,
                UsuarioId = null, // Notificação global para administradores
                EhGlobal = true,
                NivelUsuarioDestino = NivelUsuario.Administrador,
                LinkAcao = "/admin/register-request",
                ReferenciaId = usuarioId,
                TipoReferencia = "Usuario"
            };

            await EmitirAutomaticamenteAsync(createDto, "user-approval-request");
        }

        public async Task GerarNotificacoesAutomaticasAsync()
        {
            try
            {
                // Buscar produtos com estoque baixo
                var produtosEstoqueBaixo = await _uow.ProdutoRepository.ObterTodosAsync(p => p.Quantidade < p.QuantidadeMinima);

                foreach (var produto in produtosEstoqueBaixo)
                {
                    // Verificar se já existe uma notificação recente para este produto
                    var notificacoesExistentes = await _uow.NotificacaoRepository.ObterPorTipoAsync(TipoNotificacao.EstoqueBaixo);
                    var notificacaoRecente = notificacoesExistentes
                        .Where(n => n.ReferenciaId == produto.Id && n.DataCriacao >= DateTime.UtcNow.AddDays(-1))
                        .FirstOrDefault();

                    if (notificacaoRecente == null)
                    {
                        await CriarNotificacaoEstoqueBaixoAsync(produto.Id, produto.NomeProduto, (int)produto.Quantidade, (int)produto.QuantidadeMinima);
                    }
                }

                // Buscar produtos próximos ao vencimento (10 dias)
                var dataLimite = DateTime.UtcNow.AddDays(10);
                var produtosProximosVencimento = await _uow.ProdutoRepository.ObterTodosAsync(p => p.DataValidade != null && p.DataValidade <= dataLimite);

                foreach (var produto in produtosProximosVencimento)
                {
                    var tipo = produto.DataValidade <= DateTime.UtcNow ? TipoNotificacao.ProdutoVencido : TipoNotificacao.ProdutoProximoVencimento;

                    // Verificar se já existe uma notificação recente para este produto
                    var notificacoesExistentes = await _uow.NotificacaoRepository.ObterPorTipoAsync(tipo);
                    var notificacaoRecente = notificacoesExistentes
                        .Where(n => n.ReferenciaId == produto.Id && n.DataCriacao >= DateTime.UtcNow.AddDays(-1))
                        .FirstOrDefault();

                    if (notificacaoRecente == null)
                    {
                        await CriarNotificacaoProdutoVencidoAsync(produto.Id, produto.NomeProduto, produto.DataValidade ?? DateTime.MinValue);
                    }
                }

                _logger.LogInformation("Notificações automáticas geradas com sucesso");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao gerar notificações automáticas");
                throw;
            }
        }

        public async Task VerificarEmprestimosVencidosAsync()
        {
            try
            {
                var now = _timeProvider.GetUtcNow().UtcDateTime;

                var emprestimosVencidos = await _uow.EmprestimoRepository.ObterTodosAsync(e =>
                    e.Status == StatusEmprestimo.Aprovado &&
                    e.DataPrevistaDevolucao != null &&
                    e.DataPrevistaDevolucao <= now &&
                    e.DataDevolucao == null, // Ainda não foi devolvido
                    query => query
                        .Include(e => e.Solicitante)
                        .Include(e => e.Produtos)
                        .ThenInclude(p => p.Produto)
                );

                foreach (var emprestimo in emprestimosVencidos)
                {
                    await CriarNotificacaoEmprestimoVencidoAsync(emprestimo, now);
                }

                _logger.LogInformation($"Verificação de empréstimos vencidos concluída. {emprestimosVencidos.Count()} empréstimos vencidos encontrados.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao verificar empréstimos vencidos");
                throw;
            }
        }

        private async Task CriarNotificacaoEmprestimoVencidoAsync(Emprestimo emprestimo, DateTime now)
        {
            try
            {
                // Verifica se já existe uma notificação para este empréstimo vencido nas últimas 24 horas
                var ontemDateTime = DateTime.UtcNow.AddDays(-1);
                var notificacaoRecente = await _uow.NotificacaoRepository.ObterTodosAsync(n =>
                    n.TipoReferencia == "EmprestimoVencido" &&
                    n.ReferenciaId == emprestimo.Id &&
                    n.DataCriacao >= ontemDateTime);

                if (notificacaoRecente.Any())
                {
                    return; // Já foi notificado recentemente
                }

                var diasVencido = Math.Max(0, (now - emprestimo.DataPrevistaDevolucao!.Value).Days);
                var produtosList = string.Join(", ", emprestimo.Produtos.Select(p => p.Produto.NomeProduto));

                var titulo = $"Empréstimo vencido há {diasVencido} dias";
                var mensagem = $"O empréstimo #{emprestimo.Id} do usuário {emprestimo.Solicitante.NomeCompleto} " +
                              $"está vencido há {diasVencido} dias. Produtos: {produtosList}";

                var createDto = new CreateNotificacaoDTO
                {
                    Titulo = titulo,
                    Mensagem = mensagem,
                    Tipo = TipoNotificacao.Sistema,
                    UsuarioId = null,
                    EhGlobal = true,
                    NivelUsuarioDestino = NivelUsuario.Administrador,
                    LinkAcao = $"/admin/history/loan/{emprestimo.Id}",
                    ReferenciaId = emprestimo.Id,
                    TipoReferencia = "EmprestimoVencido"
                };

                await EmitirAutomaticamenteAsync(createDto, "overdue-loan");

                _logger.LogInformation($"Notificação criada para empréstimo vencido #{emprestimo.Id}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao criar notificação para empréstimo vencido #{emprestimo.Id}");
                throw;
            }
        }
    }
}
