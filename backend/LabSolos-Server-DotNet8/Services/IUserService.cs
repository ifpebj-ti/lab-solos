using LabSolos_Server_DotNet8.Models;

namespace LabSolos_Server_DotNet8.Services
{
    public interface IUserService
    {
        Task<Usuario?> ValidateUserAsync(string email, string password);
    }
}