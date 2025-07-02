using AutoMapper;
using LabSolos_Server_DotNet8.DTOs.Notificacoes;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Services
{
    public interface INotificacaoService
    {
        Task<IEnumerable<NotificacaoDTO>> ObterNotificacoesUsuarioAsync(int usuarioId, bool apenasNaoLidas = false);
        Task<IEnumerable<NotificacaoDTO>> ObterNotificacoesGlobaisAsync(bool apenasNaoLidas = false);
        Task<IEnumerable<NotificacaoDTO>> ObterNotificacoesFiltradas(int usuarioId, string nivelUsuario, bool apenasNaoLidas = false);
        Task<int> ContarNaoLidasUsuarioAsync(int usuarioId);
        Task<int> ContarNaoLidasFiltradas(int usuarioId, string nivelUsuario);
        Task<NotificacaoDTO> CriarNotificacaoAsync(CreateNotificacaoDTO createDto);
        Task MarcarComoLidaAsync(int notificacaoId);
        Task MarcarVariasComoLidaAsync(int[] notificacaoIds);
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
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<NotificacaoService> _logger;

        public NotificacaoService(IUnitOfWork uow, IMapper mapper, ILogger<NotificacaoService> logger)
        {
            _uow = uow;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task<IEnumerable<NotificacaoDTO>> ObterNotificacoesUsuarioAsync(int usuarioId, bool apenasNaoLidas = false)
        {
            var notificacoes = await _uow.NotificacaoRepository.ObterPorUsuarioAsync(usuarioId, apenasNaoLidas);
            return _mapper.Map<IEnumerable<NotificacaoDTO>>(notificacoes);
        }

        public async Task<IEnumerable<NotificacaoDTO>> ObterNotificacoesGlobaisAsync(bool apenasNaoLidas = false)
        {
            var notificacoes = await _uow.NotificacaoRepository.ObterGlobaisAsync(apenasNaoLidas);
            return _mapper.Map<IEnumerable<NotificacaoDTO>>(notificacoes);
        }

        public async Task<IEnumerable<NotificacaoDTO>> ObterNotificacoesFiltradas(int usuarioId, string nivelUsuario, bool apenasNaoLidas = false)
        {
            var notificacoesUsuario = await _uow.NotificacaoRepository.ObterPorUsuarioAsync(usuarioId, apenasNaoLidas);
            var notificacoesGlobais = await _uow.NotificacaoRepository.ObterGlobaisAsync(apenasNaoLidas);

            var todasNotificacoes = notificacoesUsuario.Concat(notificacoesGlobais);

            // Filtrar notificações baseado no nível do usuário
            var notificacoesFiltradas = FiltrarNotificacoesPorNivelUsuario(todasNotificacoes, nivelUsuario);

            return _mapper.Map<IEnumerable<NotificacaoDTO>>(notificacoesFiltradas.OrderByDescending(n => n.DataCriacao));
        }

        public async Task<int> ContarNaoLidasUsuarioAsync(int usuarioId)
        {
            var usuarioCount = await _uow.NotificacaoRepository.ContarNaoLidasPorUsuarioAsync(usuarioId);
            var globaisCount = await _uow.NotificacaoRepository.ContarNaoLidasGlobaisAsync();
            return usuarioCount + globaisCount;
        }

        public async Task<int> ContarNaoLidasFiltradas(int usuarioId, string nivelUsuario)
        {
            var notificacoesUsuario = await _uow.NotificacaoRepository.ObterPorUsuarioAsync(usuarioId, true);
            var notificacoesGlobais = await _uow.NotificacaoRepository.ObterGlobaisAsync(true);

            var todasNotificacoes = notificacoesUsuario.Concat(notificacoesGlobais);
            var notificacoesFiltradas = FiltrarNotificacoesPorNivelUsuario(todasNotificacoes, nivelUsuario);

            return notificacoesFiltradas.Count();
        }

        public async Task<NotificacaoDTO> CriarNotificacaoAsync(CreateNotificacaoDTO createDto)
        {
            var notificacao = _mapper.Map<Notificacao>(createDto);
            notificacao.DataCriacao = DateTime.UtcNow;
            notificacao.Lida = false;

            var novaNotificacao = _uow.NotificacaoRepository.Criar(notificacao);
            await _uow.CommitAsync();

            _logger.LogInformation("Notificação criada: {Titulo} para usuário {UsuarioId}",
                notificacao.Titulo, notificacao.UsuarioId ?? 0);

            return _mapper.Map<NotificacaoDTO>(novaNotificacao);
        }

        public async Task MarcarComoLidaAsync(int notificacaoId)
        {
            await _uow.NotificacaoRepository.MarcarComoLidaAsync(notificacaoId);
            await _uow.CommitAsync();

            _logger.LogInformation("Notificação {NotificacaoId} marcada como lida", notificacaoId);
        }

        public async Task MarcarVariasComoLidaAsync(int[] notificacaoIds)
        {
            await _uow.NotificacaoRepository.MarcarVariasComoLidaAsync(notificacaoIds);
            await _uow.CommitAsync();

            _logger.LogInformation("Marcadas {Count} notificações como lidas", notificacaoIds.Length);
        }

        public async Task<bool> MarcarComoLidaComVerificacaoAsync(int notificacaoId, int usuarioId)
        {
            // Verificar se o usuário pode acessar esta notificação
            var podeAcessar = await UsuarioPodeAcessarNotificacaoAsync(notificacaoId, usuarioId);
            if (!podeAcessar)
            {
                _logger.LogWarning("Usuário {UsuarioId} tentou marcar notificação {NotificacaoId} sem permissão", usuarioId, notificacaoId);
                return false;
            }

            await _uow.NotificacaoRepository.MarcarComoLidaAsync(notificacaoId);
            await _uow.CommitAsync();

            _logger.LogInformation("Notificação {NotificacaoId} marcada como lida pelo usuário {UsuarioId}", notificacaoId, usuarioId);
            return true;
        }

        public async Task<int> MarcarVariasComoLidaComVerificacaoAsync(int[] notificacaoIds, int usuarioId)
        {
            var notificacoesPermitidas = new List<int>();

            foreach (var notificacaoId in notificacaoIds)
            {
                var podeAcessar = await UsuarioPodeAcessarNotificacaoAsync(notificacaoId, usuarioId);
                if (podeAcessar)
                {
                    notificacoesPermitidas.Add(notificacaoId);
                }
                else
                {
                    _logger.LogWarning("Usuário {UsuarioId} tentou marcar notificação {NotificacaoId} sem permissão", usuarioId, notificacaoId);
                }
            }

            if (notificacoesPermitidas.Any())
            {
                await _uow.NotificacaoRepository.MarcarVariasComoLidaAsync(notificacoesPermitidas.ToArray());
                await _uow.CommitAsync();

                _logger.LogInformation("Marcadas {Count} notificações como lidas pelo usuário {UsuarioId}", notificacoesPermitidas.Count, usuarioId);
            }

            return notificacoesPermitidas.Count;
        }

        public async Task<bool> UsuarioPodeAcessarNotificacaoAsync(int notificacaoId, int usuarioId)
        {
            var notificacao = await _uow.NotificacaoRepository.ObterPorIdAsync(notificacaoId);
            if (notificacao == null)
                return false;

            // Notificações globais (sem usuário específico) podem ser acessadas por qualquer usuário autenticado
            if (notificacao.UsuarioId == null)
                return true;

            // Notificações específicas só podem ser acessadas pelo usuário destinatário
            return notificacao.UsuarioId == usuarioId;
        }

        private IEnumerable<Notificacao> FiltrarNotificacoesPorNivelUsuario(IEnumerable<Notificacao> notificacoes, string nivelUsuario)
        {
            // Administradores veem todas as notificações
            if (nivelUsuario == "Administrador")
                return notificacoes;

            // Tipos de notificação que só administradores devem ver
            var tiposAdminApenas = new[]
            {
                TipoNotificacao.EstoqueBaixo,
                TipoNotificacao.ProdutoVencido,
                TipoNotificacao.ProdutoProximoVencimento,
                TipoNotificacao.SolicitacaoUsuario,
                TipoNotificacao.SolicitacaoCadastro,
                TipoNotificacao.NovoEmprestimo,
                TipoNotificacao.SolicitacaoEmprestimo
            };

            // Filtrar notificações para usuários não-administradores
            return notificacoes.Where(n =>
                // Notificações pessoais (com UsuarioId) sempre são incluídas
                n.UsuarioId != null ||
                // Notificações globais só se não forem de tipos exclusivos de admin
                !tiposAdminApenas.Contains(n.Tipo)
            );
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

            await CriarNotificacaoAsync(createDto);
        }

        public async Task CriarNotificacaoProdutoVencidoAsync(int produtoId, string nomeProduto, DateTime dataVencimento)
        {
            var diasVencimento = (dataVencimento - DateTime.Now).Days;
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

            await CriarNotificacaoAsync(createDto);
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

            await CriarNotificacaoAsync(createDto);
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

            await CriarNotificacaoAsync(createDto);
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

            await CriarNotificacaoAsync(createDto);
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

            await CriarNotificacaoAsync(createDto);
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
                var dataLimite = DateTime.Now.AddDays(10);
                var produtosProximosVencimento = await _uow.ProdutoRepository.ObterTodosAsync(p => p.DataValidade != null && p.DataValidade <= dataLimite);

                foreach (var produto in produtosProximosVencimento)
                {
                    var tipo = produto.DataValidade <= DateTime.Now ? TipoNotificacao.ProdutoVencido : TipoNotificacao.ProdutoProximoVencimento;

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
                var dataLimite = DateTime.Now.AddDays(-7); // Empréstimos aprovados há mais de 7 dias

                var emprestimosVencidos = await _uow.EmprestimoRepository.ObterTodosAsync(e =>
                    e.Status == StatusEmprestimo.Aprovado &&
                    e.DataAprovacao != null &&
                    e.DataAprovacao < dataLimite &&
                    e.DataDevolucao == null, // Ainda não foi devolvido
                    query => query
                        .Include(e => e.Solicitante)
                        .Include(e => e.Produtos)
                        .ThenInclude(p => p.Produto)
                );

                foreach (var emprestimo in emprestimosVencidos)
                {
                    await CriarNotificacaoEmprestimoVencidoAsync(emprestimo);
                }

                _logger.LogInformation($"Verificação de empréstimos vencidos concluída. {emprestimosVencidos.Count()} empréstimos vencidos encontrados.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao verificar empréstimos vencidos");
                throw;
            }
        }

        private async Task CriarNotificacaoEmprestimoVencidoAsync(Emprestimo emprestimo)
        {
            try
            {
                // Verifica se já existe uma notificação para este empréstimo vencido nas últimas 24 horas
                var ontemDateTime = DateTime.Now.AddDays(-1);
                var notificacaoRecente = await _uow.NotificacaoRepository.ObterTodosAsync(n =>
                    n.TipoReferencia == "EmprestimoVencido" &&
                    n.ReferenciaId == emprestimo.Id &&
                    n.DataCriacao >= ontemDateTime);

                if (notificacaoRecente.Any())
                {
                    return; // Já foi notificado recentemente
                }

                // Busca administradores para notificar
                var usuarios = await _uow.UsuarioRepository.ObterTodosAsync(u =>
                    u.TipoUsuario == TipoUsuario.Administrador &&
                    u.Status == StatusUsuario.Habilitado);

                var diasVencido = (DateTime.Now - emprestimo.DataAprovacao!.Value).Days;
                var produtosList = string.Join(", ", emprestimo.Produtos.Select(p => p.Produto.NomeProduto));

                var titulo = $"Empréstimo vencido há {diasVencido} dias";
                var mensagem = $"O empréstimo #{emprestimo.Id} do usuário {emprestimo.Solicitante.NomeCompleto} " +
                              $"está vencido há {diasVencido} dias. Produtos: {produtosList}";

                foreach (var admin in usuarios)
                {
                    var createDto = new CreateNotificacaoDTO
                    {
                        Titulo = titulo,
                        Mensagem = mensagem,
                        Tipo = TipoNotificacao.Sistema,
                        UsuarioId = admin.Id,
                        LinkAcao = $"/admin/history/loan/{emprestimo.Id}",
                        ReferenciaId = emprestimo.Id,
                        TipoReferencia = "EmprestimoVencido"
                    };

                    await CriarNotificacaoAsync(createDto);
                }

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
