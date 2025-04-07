using System.Linq.Expressions;
using Core.Pagination;
using LabSolos_Server_DotNet8.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Repositories
{
    public interface IRepository<T>
    {
        Task<IEnumerable<T>> ObterTodosAsync(Expression<Func<T, bool>> predicate, Func<IQueryable<T>, IQueryable<T>>? include = null);
        Task<T?> ObterAsync(Expression<Func<T, bool>> predicate, Func<IQueryable<T>, IQueryable<T>>? include = null);
        bool Existe(Expression<Func<T, bool>> predicate);
        T Criar(T entity);
        T Atualizar(T entity);
        T Remover(T entity);
    }

    public class Repository<T>(AppDbContext context) : IRepository<T> where T : class
    {
        protected readonly AppDbContext _context = context;

        public async Task<IEnumerable<T>> ObterTodosAsync(Expression<Func<T, bool>> predicate, Func<IQueryable<T>, IQueryable<T>>? include = null)
        {
            IQueryable<T> query = _context.Set<T>().AsNoTracking();

            // Aplica o include se fornecido
            if (include != null)
            {
                query = include(query);
            }

            return await query.Where(predicate).ToListAsync();
        }

        public async Task<T?> ObterAsync(Expression<Func<T, bool>> predicate, Func<IQueryable<T>, IQueryable<T>>? include = null)
        {
            IQueryable<T> query = _context.Set<T>().AsNoTracking();

            // Aplica o include se fornecido
            if (include != null)
            {
                query = include(query);
            }

            return await query.FirstOrDefaultAsync(predicate);
        }

        public bool Existe(Expression<Func<T, bool>> predicate)
        {
            return _context.Set<T>().AsNoTracking().Any(predicate);
        }

        public T Criar(T entity)
        {
            _context.Set<T>().Add(entity);
            return entity;
        }

        public T Atualizar(T entity)
        {
            _context.Entry(entity).State = EntityState.Modified;
            return entity;
        }

        public T Remover(T entity)
        {
            _context.Set<T>().Remove(entity);
            return entity;
        }
    }
}
