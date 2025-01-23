using Microsoft.AspNetCore.Mvc.Filters;

namespace LabSolos_Server_DotNet8.Filters
{
    public class ApiLoggingFilter(ILogger<ApiLoggingFilter> logger) : IActionFilter
    {
        private readonly ILogger<ApiLoggingFilter> _logger = logger;

        public void OnActionExecuting(ActionExecutingContext context)
        {
            // Executa antes da Action
            _logger.LogInformation("OnActionExecuting: {ActionName} no controller {ControllerName} com ModelState {ModelState}",
                context.ActionDescriptor.DisplayName,
                context.Controller.GetType().Name,
                context.ModelState.IsValid);
        }

        public void OnActionExecuted(ActionExecutedContext context)
        {
            if (context.Exception != null)
            {
                // Log simplificado para exceções
                _logger.LogError(context.Exception,
                    "OnException: Exceção na ação {ActionName} do controller {ControllerName}",
                    context.ActionDescriptor.DisplayName,
                    context.Controller.GetType().Name);
            }
            else
            {
                // Log normal quando não há exceção
                var statusCode = context.HttpContext.Response?.StatusCode;
                _logger.LogInformation("OnActionExecuted: {ActionName} no controller {ControllerName} com StatusCode {StatusCode}",
                    context.ActionDescriptor.DisplayName,
                    context.Controller.GetType().Name,
                    statusCode);
            }
        }
    }
}