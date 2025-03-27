using LabSolos_Server_DotNet8.Dtos.Emprestimos;
using LabSolos_Server_DotNet8.DTOs.Emprestimos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;

namespace LabSolos_Server_DotNet8.Services
{
    public interface IEmprestimoService
    {
        Task<Emprestimo?> GetByIdAsync(int id);
        Task<IEnumerable<EmprestimoDTO>> GetTodosEmprestimosAsync();
        Task<IEnumerable<EmprestimoDTO>> GetEmprestimosSolicitadosUsuario(int userId);
        Task<IEnumerable<EmprestimoDTO>> GetEmprestimosAprovadosUsuario(int userId);
        Task<IEnumerable<EmprestimoDTO>> GetEmprestimosUsuario(int userId);
        Task<Emprestimo> AddEmprestimo(AddEmprestimoDTO addEmprestimoDTO);
        Task UpdateAsync(Emprestimo emprestimo);
    }
    public class EmprestimoService(IEmprestimoRepository emprestimoRepository, IProdutoRepository produtoRepository) : IEmprestimoService
    {
        private readonly IEmprestimoRepository _emprestimoRepository = emprestimoRepository;
        private readonly IProdutoRepository _produtoRepository = produtoRepository;


        public async Task<Emprestimo?> GetByIdAsync(int id)
        {
            return await _emprestimoRepository.GetByIdAsync(id);
        }
        public async Task<IEnumerable<EmprestimoDTO>> GetEmprestimosUsuario(int userId)
        {
            var emprestimos = await _emprestimoRepository.GetEmprestimosUsuario(userId);
            var emprestimosDTO = emprestimos.Select(e => Emprestimo.MapToDTO(e)).ToList();
            return emprestimosDTO;
        }

        public async Task<IEnumerable<EmprestimoDTO>> GetEmprestimosSolicitadosUsuario(int userId)
        {
            var emprestimos = await _emprestimoRepository.GetEmprestimosSolicitadosUsuario(userId);
            var emprestimosDTO = emprestimos.Select(e => Emprestimo.MapToDTO(e)).ToList();
            return emprestimosDTO;
        }

        public async Task<IEnumerable<EmprestimoDTO>> GetTodosEmprestimosAsync()
        {
            var emprestimos = await _emprestimoRepository.GetTodosEmprestimosAsync();
            var emprestimosDTO = emprestimos.Select(e => Emprestimo.MapToDTO(e)).ToList();

            return emprestimosDTO;
        }

        public async Task<IEnumerable<EmprestimoDTO>> GetEmprestimosAprovadosUsuario(int userId)
        {
            var emprestimos = await _emprestimoRepository.GetEmprestimosAprovadosUsuario(userId);
            var emprestimosDTO = emprestimos.Select(e => Emprestimo.MapToDTO(e)).ToList();

            return emprestimosDTO;
        }

        public async Task<Emprestimo> AddEmprestimo(AddEmprestimoDTO addEmprestimoDTO)
        {
            // Validação dos dados
            if (addEmprestimoDTO == null || addEmprestimoDTO.Produtos == null || addEmprestimoDTO.Produtos.Count == 0)
            {
                throw new ArgumentException("Dados do empréstimo inválidos.");
            }

            // Obter os IDs dos produtos solicitados
            var produtoIds = addEmprestimoDTO.Produtos.Select(p => p.ProdutoId).ToList();

            // Obter os produtos do banco de dados
            var produtos = await _produtoRepository.GetProdutosByIds(produtoIds);

            if (produtos.Count != produtoIds.Count)
            {
                throw new ArgumentException("Um ou mais produtos fornecidos não existem.");
            }

            // Verifica se todos os produtos têm estoque suficiente
            foreach (var pq in addEmprestimoDTO.Produtos)
            {
                var produto = produtos.FirstOrDefault(p => p.Id == pq.ProdutoId);

                if (produto == null)
                {
                    throw new ArgumentException($"O produto com ID {pq.ProdutoId} não foi encontrado.");
                }

                if (produto.Status != StatusProduto.Disponivel && produto.Status != StatusProduto.Solicitado)
                {
                    throw new InvalidOperationException($"O produto '{produto.NomeProduto}' não está disponível para empréstimo.");
                }

                if (produto.Quantidade < pq.Quantidade)
                {
                    throw new InvalidOperationException($"O produto '{produto.NomeProduto}' não tem quantidade suficiente disponível.");
                }
            }

            // Criar a lista de itens de empréstimo associando os produtos às quantidades
            var itensEmprestimo = addEmprestimoDTO.Produtos.Select(pq => new EmprestimoProduto
            {
                ProdutoId = pq.ProdutoId,
                Quantidade = pq.Quantidade
            }).ToList();

            // Atualizar status dos produtos para 'Solicitado' e reduzir a quantidade disponível
            foreach (var pq in addEmprestimoDTO.Produtos)
            {
                var produto = produtos.First(p => p.Id == pq.ProdutoId);
                produto.Status = StatusProduto.Solicitado;
            }

            // Criar o objeto Emprestimo
            var novoEmprestimo = new Emprestimo
            {
                DataRealizacao = DateTime.UtcNow,
                DataDevolucao = DateTime.Today.AddDays(addEmprestimoDTO.DiasParaDevolucao),
                Status = StatusEmprestimo.Pendente,
                SolicitanteId = addEmprestimoDTO.SolicitanteId,
                EmprestimoProdutos = itensEmprestimo
            };

            // Atualizar os produtos no banco
            await _produtoRepository.UpdateProdutos(produtos);

            var emprestimoAdicionado = await _emprestimoRepository.AddEmprestimo(novoEmprestimo);
            
            return emprestimoAdicionado;
        }


        public async Task UpdateAsync(Emprestimo emprestimo)
        {
            await _emprestimoRepository.UpdateAsync(emprestimo);
        }
    }
}
