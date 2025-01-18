using LabSolos_Server_DotNet8.DTOs.System;

namespace LabSolos_Server_DotNet8.Services
{
    public interface ISystemService
    {
        Task<QuantitiesDTO> GetSystemQuantitiesAsync();
    }
}