using LabSolos_Server_DotNet8.Dtos.Emprestimos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;

namespace LabSolos_Server_DotNet8.Services
{
    public interface IEmprestimoService
    {
        Task<IEnumerable<object>> GetEmprestimosSolicitadosUsuario(int userId);
        Task<IEnumerable<object>> GetEmprestimosAprovadosUsuario(int userId);
        Task<IEnumerable<object>> GetEmprestimosUsuario(int userId);
        Task<Emprestimo> AddEmprestimo(AddEmprestimoDTO addEmprestimoDTO);
    }
    public class EmprestimoService(IEmprestimoRepository emprestimoRepository, IProdutoRepository produtoRepository) : IEmprestimoService
    {
        private readonly IEmprestimoRepository _emprestimoRepository = emprestimoRepository;
        private readonly IProdutoRepository _produtoRepository = produtoRepository;


        public async Task<IEnumerable<object>> GetEmprestimosUsuario(int userId)
        {
            var emprestimos = await _emprestimoRepository.GetEmprestimosUsuario(userId);

            return emprestimos;
        }

        public async Task<IEnumerable<object>> GetEmprestimosSolicitadosUsuario(int userId)
        {
            var emprestimos = await _emprestimoRepository.GetEmprestimosSolicitadosUsuario(userId);

            return emprestimos;
        }

        public async Task<IEnumerable<object>> GetEmprestimosAprovadosUsuario(int userId)
        {
            var emprestimos = await _emprestimoRepository.GetEmprestimosAprovadosUsuario(userId);

            return emprestimos;
        }

        public async Task<Emprestimo> AddEmprestimo(AddEmprestimoDTO addEmprestimoDTO)
        {
            // Validação dos dados
            if (addEmprestimoDTO == null || addEmprestimoDTO.ProdutosIds == null || addEmprestimoDTO.ProdutosIds.Count == 0)
            {
                throw new ArgumentException("Dados do empréstimo inválidos.");
            }

            // Obter os produtos do banco de dados
            var produtos = await _produtoRepository.GetProdutosByIds(addEmprestimoDTO.ProdutosIds);

            if (produtos.Count != addEmprestimoDTO.ProdutosIds.Count)
            {
                throw new ArgumentException("Um ou mais produtos fornecidos não existem.");
            }

            foreach (var produto in produtos)
            {
                if (produto.Status != StatusProduto.Disponivel && produto.Status != StatusProduto.Solicitado)
                {
                    throw new InvalidOperationException($"O produto '{produto.NomeProduto}' não está disponível para empréstimo.");
                }
            }

            // Atualizar status dos produtos para 'Emprestado'
            foreach (var produto in produtos)
            {
                produto.Status = StatusProduto.Solicitado;
            }

            // Criar o objeto Emprestimo
            var novoEmprestimo = new Emprestimo
            {
                DataRealizacao = DateTime.Now,
                DataDevolucao = DateTime.Today.AddDays(addEmprestimoDTO.DiasParaDevolucao),
                Status = StatusEmprestimo.Pendente,
                SolicitanteId = addEmprestimoDTO.SolicitanteId,
                Produtos = produtos
            };

            // Salvar no banco via repositório
            await _produtoRepository.UpdateProdutos(produtos); // Atualizar os produtos no banco
            return await _emprestimoRepository.AddEmprestimo(novoEmprestimo);
        }
    }
}
