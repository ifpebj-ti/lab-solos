using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Repositories
{

    public interface IUnitOfWork
    {
        IRepository<Academico> AcademicoRepository { get; }
        IRepository<Administrador> AdministradorRepository { get; }
        IRepository<Dependente> DependenteRepository { get; }
        IRepository<Emprestimo> EmprestimoRepository { get; }
        IRepository<ProdutoEmprestado> ProdutoEmprestadoRepository { get; }
        IRepository<Lote> LoteRepository { get; }
        IRepository<Produto> ProdutoRepository { get; }
        IRepository<Quimico> QuimicoRepository { get; }
        IRepository<Usuario> UsuarioRepository { get; }
        IRepository<Vidraria> VidrariaRepository { get; }
        INotificacaoRepository NotificacaoRepository { get; }
        ILogAuditoriaRepository LogAuditoriaRepository { get; }

        Task CommitAsync();
    }

    public class UnitOfWork : IUnitOfWork, IDisposable
    {
        private readonly AppDbContext _context;

        private IRepository<Academico>? _academicoRepository;
        private IRepository<Administrador>? _administradorRepository;
        private IRepository<Dependente>? _dependenteRepository;
        private IRepository<Emprestimo>? _emprestimoRepository;
        private IRepository<ProdutoEmprestado>? _produtoEmprestadoRepository;
        private IRepository<Lote>? _loteRepository;
        private IRepository<Produto>? _produtoRepository;
        private IRepository<Quimico>? _quimicoRepository;
        private IRepository<Usuario>? _usuarioRepository;
        private IRepository<Vidraria>? _vidrariaRepository;
        private INotificacaoRepository? _notificacaoRepository;
        private ILogAuditoriaRepository? _logAuditoriaRepository;

        public UnitOfWork(AppDbContext context)
        {
            _context = context;
        }

        public IRepository<Academico> AcademicoRepository
        {
            get
            {
                return _academicoRepository ??= new Repository<Academico>(_context);
            }
        }

        public IRepository<Administrador> AdministradorRepository
        {
            get
            {
                return _administradorRepository ??= new Repository<Administrador>(_context);
            }
        }

        public IRepository<Dependente> DependenteRepository
        {
            get
            {
                return _dependenteRepository ??= new Repository<Dependente>(_context);
            }
        }

        public IRepository<Emprestimo> EmprestimoRepository
        {
            get
            {
                return _emprestimoRepository ??= new Repository<Emprestimo>(_context);
            }
        }

        public IRepository<ProdutoEmprestado> ProdutoEmprestadoRepository
        {
            get
            {
                return _produtoEmprestadoRepository ??= new Repository<ProdutoEmprestado>(_context);
            }
        }

        public IRepository<Lote> LoteRepository
        {
            get
            {
                return _loteRepository ??= new Repository<Lote>(_context);
            }
        }

        public IRepository<Produto> ProdutoRepository
        {
            get
            {
                return _produtoRepository ??= new Repository<Produto>(_context);
            }
        }

        public IRepository<Quimico> QuimicoRepository
        {
            get
            {
                return _quimicoRepository ??= new Repository<Quimico>(_context);
            }
        }

        public IRepository<Usuario> UsuarioRepository
        {
            get
            {
                return _usuarioRepository ??= new Repository<Usuario>(_context);
            }
        }

        public IRepository<Vidraria> VidrariaRepository
        {
            get
            {
                return _vidrariaRepository ??= new Repository<Vidraria>(_context);
            }
        }

        public INotificacaoRepository NotificacaoRepository
        {
            get
            {
                return _notificacaoRepository ??= new NotificacaoRepository(_context);
            }
        }

        public ILogAuditoriaRepository LogAuditoriaRepository
        {
            get
            {
                return _logAuditoriaRepository ??= new LogAuditoriaRepository(_context);
            }
        }

        public async Task CommitAsync()
        {
            await _context.SaveChangesAsync();
        }

        public void Dispose()
        {
            _context.Dispose();
        }
    }
}