using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace LabSolos_Server_DotNet8.Filters;

public class ApiExceptionFilter(ILogger<ApiExceptionFilter> logger) : IExceptionFilter
{
    private readonly ILogger<ApiExceptionFilter> _logger = logger;

    public void OnException(ExceptionContext context)
    {
        // Gera um identificador único para o erro
        var errorId = Guid.NewGuid().ToString();

        // Log detalhado para rastreamento interno
        _logger.LogError(context.Exception,
            "Erro ID: {ErrorId} - Exceção não tratada capturada",
            errorId);

        // Detalhes do erro para resposta ao cliente
        var DetalhesErro = new
        {
            ErrorId = errorId,
            Message = "Ocorreu um problema ao processar a sua solicitação. Se o problema persistir, entre em contato com o administrador do sistema informando o código do erro.",
            StatusCode = StatusCodes.Status500InternalServerError
        };

        // Configura a resposta HTTP
        context.Result = new ObjectResult(DetalhesErro)
        {
            StatusCode = StatusCodes.Status500InternalServerError
        };

        // Marca a exceção como tratada
        context.ExceptionHandled = true;
    }
}
