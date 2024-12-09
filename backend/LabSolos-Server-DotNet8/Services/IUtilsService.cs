using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LabSolos_Server_DotNet8.DTOs;
using LabSolos_Server_DotNet8.DTOs.Lotes;

namespace LabSolos_Server_DotNet8.Services
{
    public interface IUtilitiesService
    {
        T ValidarEnum<T>(string? valor, string campo, T valorPadrao) where T : struct, Enum;
        DateTime? ConverterParaDateTime(string? dataString);
    }
}