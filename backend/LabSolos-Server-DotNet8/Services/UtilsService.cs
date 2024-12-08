using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LabSolos_Server_DotNet8.DTOs;
using LabSolos_Server_DotNet8.DTOs.Lotes;

namespace LabSolos_Server_DotNet8.Services
{
    public class UtilitiesService : IUtilitiesService
    {
        

        public T ValidarEnum<T>(string? valor, string campo, T valorPadrao) where T : struct, Enum
        {
            if (string.IsNullOrWhiteSpace(valor))
            {
                return valorPadrao;
            }

            if (!Enum.TryParse(valor, true, out T resultado))
            {
                throw new ArgumentException($"O valor '{valor}' para o campo '{campo}' é inválido. Valores aceitos: {string.Join(", ", Enum.GetNames(typeof(T)))}");
            }

            return resultado;
        }

        public DateTime? ConverterParaDateTime(string? dataString)
        {
            if (string.IsNullOrWhiteSpace(dataString))
            {
                return null; // Retorna null se a string for vazia ou nula
            }

            if (DateTime.TryParse(dataString, out DateTime dataConvertida))
            {
                return dataConvertida; // Retorna a data convertida se for válida
            }

            throw new ArgumentException($"A data '{dataString}' é inválida."); // Lança exceção para valores inválidos
        }

    }
}