using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Controllers;

namespace LabSolos_Server_DotNet8.Filters
{
    public class ApiLoggingFilter(ILogger<ApiLoggingFilter> logger) : IActionFilter
    {
        private static readonly Action<ILogger, string, bool, Exception?> LogActionStarted =
            LoggerMessage.Define<string, bool>(
                LogLevel.Information,
                new EventId(0, nameof(LogActionStarted)),
                "API action started: {Action} with valid model state {ModelState}");
        private static readonly Action<ILogger, string, string, Exception?> LogActionFailed =
            LoggerMessage.Define<string, string>(
                LogLevel.Error,
                new EventId(0, nameof(LogActionFailed)),
                "API action {Action} failed with exception type {ExceptionType}");
        private static readonly Action<ILogger, string, int?, Exception?> LogActionCompleted =
            LoggerMessage.Define<string, int?>(
                LogLevel.Information,
                new EventId(0, nameof(LogActionCompleted)),
                "API action {Action} completed with status {StatusCode}");

        private readonly ILogger<ApiLoggingFilter> _logger = logger;

        public void OnActionExecuting(ActionExecutingContext context)
        {
            LogActionStarted(_logger,
                ObterNomeAcao(context.ActionDescriptor),
                context.ModelState.IsValid,
                null);
        }

        public void OnActionExecuted(ActionExecutedContext context)
        {
            if (context.Exception != null)
            {
                LogActionFailed(_logger,
                    ObterNomeAcao(context.ActionDescriptor),
                    context.Exception.GetType().Name,
                    null);
            }
            else
            {
                var statusCode = context.HttpContext.Response?.StatusCode;
                LogActionCompleted(_logger,
                    ObterNomeAcao(context.ActionDescriptor),
                    statusCode,
                    null);
            }
        }

        private static string ObterNomeAcao(Microsoft.AspNetCore.Mvc.Abstractions.ActionDescriptor descriptor) =>
            descriptor is ControllerActionDescriptor controllerAction
                ? $"{controllerAction.ControllerName}.{controllerAction.ActionName}"
                : "api.action";
    }
}
