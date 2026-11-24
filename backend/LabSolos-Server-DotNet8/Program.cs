using LabSolos_Server_DotNet8.BackgroundServices;
using LabSolos_Server_DotNet8.Controllers;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Data.Seeds;
using LabSolos_Server_DotNet8.Filters;
using LabSolos_Server_DotNet8.Middlewares;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.Services.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Net;
using System.Security.Claims;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

Program.ConfigureServices(builder);
var app = builder.Build();
Program.InitializeDatabase(app);
Program.ConfigurePipeline(app, builder.Configuration);
app.Run();

public partial class Program
{
    private static void ConfigureServices(WebApplicationBuilder builder)
    {
        // Adicionar suporte para controladores
        builder.Services.AddControllers(options =>
        {
            options.Filters.Add(typeof(ApiLoggingFilter));
            options.Filters.Add(typeof(ApiExceptionFilter));
            options.Filters.Add<ApiErrorContractFilter>();
            options.ModelBinderProviders.Insert(0, new ApiDateFilterBinderProvider());
        })
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
            options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        }).AddNewtonsoftJson(options =>
        {
            options.SerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore;
        });

        builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var errors = context.ModelState
                    .Where(entry => entry.Value?.Errors.Count > 0)
                    .GroupBy(entry => entry.Value!.Errors.Any(error => error.Exception is not null)
                        ? ""
                        : System.Text.Json.JsonNamingPolicy.CamelCase.ConvertName(entry.Key))
                    .ToDictionary(group => group.Key, _ => Program.ValidationErrorMessages);
                var problem = new Microsoft.AspNetCore.Mvc.ValidationProblemDetails(errors)
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Verifique os dados informados."
                };
                problem.Extensions["code"] = "validation_failed";
                return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(problem);
            };
        });

        // Configuração de algumas dependẽncias
        builder.Services.AddSingleton(TimeProvider.System);
        builder.Services.AddSingleton<ProductCivilDay>();

        builder.Services.AddScoped<IEmailService, EmailService>();
        builder.Services.AddPasswordSecurity();

        builder.Services.AddScoped<IUsuarioService, UsuarioService>();
        builder.Services.AddScoped<IProdutoService, ProdutoService>();
        builder.Services.AddScoped<IProductLifecycleService, ProductLifecycleService>();
        builder.Services.AddScoped<ProductEffectiveOutflowQuery>();
        builder.Services.AddScoped<ProductHistoryAccessService>();
        builder.Services.AddScoped<ILoteService, LoteService>();
        builder.Services.AddScoped<IUtilitiesService, UtilitiesService>();
        builder.Services.AddScoped<ISystemService, SystemService>();
        builder.Services.AddScoped<INotificacaoService, NotificacaoService>();
        builder.Services.AddScoped<IAuditoriaService, AuditoriaService>();

        builder.Services.AddAutoMapper(_ => { }, AppDomain.CurrentDomain.GetAssemblies());

        builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
        builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        builder.Services.AddScoped<IEmprestimoRepository, EmprestimoRepository>();
        builder.Services.AddScoped<IProdutoRepository, ProdutoRepository>();
        builder.Services.AddScoped<ILoanDecisionService, LoanDecisionService>();
        builder.Services.AddScoped<ISessaoService, SessaoService>();
        builder.Services.AddScoped<EmailChangeNoticeService>();

        // Adicionar o background service para verificação de empréstimos vencidos
        builder.Services.AddHostedService<EmprestimosVencidosBackgroundService>();
        builder.Services.AddHostedService<EmailChangeNoticeBackgroundService>();

        builder.Services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(builder.Configuration.GetConnectionString("PostgresConnection")));

        // Configurar o Swagger para documentação da API
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();
        builder.Services.AddHealthChecks()
            .AddCheck<AuthenticationProtectionReadinessHealthCheck>("authentication-protection-readiness");

        // Configurar JWT
        var jwtService = new JwtService(builder.Configuration);
        builder.Services.AddSingleton(jwtService);
        ConfigureJwtAuthentication(builder.Services, jwtService);
        ConfigureAuthorization(builder.Services);

        if (builder.Environment.IsDevelopment())
        {
            var developmentOrigins = Program.GetDevelopmentOrigins(builder.Configuration);

            builder.Services.AddCors(options => options.AddPolicy("DevelopmentClients", policy =>
                policy.SetIsOriginAllowed(origin => developmentOrigins.Contains(origin, StringComparer.Ordinal))
                    .WithMethods("GET", "POST", "PATCH", "PUT", "DELETE")
                    .WithHeaders("Authorization", "Content-Type", "X-CSRF-Token")
                    .AllowCredentials()
                    .WithExposedHeaders("Retry-After")));
        }
    }

    private static void ConfigureJwtAuthentication(IServiceCollection services, JwtService jwtService)
    {
        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = SessaoAutenticacaoDefaults.CompositeScheme;
            options.DefaultChallengeScheme = SessaoAutenticacaoDefaults.CompositeScheme;
        })
        .AddPolicyScheme(SessaoAutenticacaoDefaults.CompositeScheme, null, options =>
        {
            options.ForwardDefaultSelector = context =>
            {
                var authorization = context.Request.Headers.Authorization.ToString();
                if (authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    return JwtBearerDefaults.AuthenticationScheme;
                }

                return context.Request.Cookies.ContainsKey(SessaoAutenticacaoDefaults.CookieName)
                    ? SessaoAutenticacaoDefaults.CookieScheme
                    : JwtBearerDefaults.AuthenticationScheme;
            };
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = jwtService.CreateValidationParameters();
            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = async context =>
                {
                    var subject = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier) ??
                        context.Principal?.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
                    var sessionVersionClaim = context.Principal?.FindFirstValue(JwtClaimNames.SessionVersion);
                    var passwordChangeClaim = context.Principal?.FindFirstValue(JwtClaimNames.PasswordChangeRequired);
                    var role = context.Principal?.FindFirstValue(ClaimTypes.Role);
                    var jwtId = context.Principal?.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti);

                    if (!int.TryParse(subject, out var userId) ||
                        !long.TryParse(sessionVersionClaim, out var sessionVersion) ||
                        !bool.TryParse(passwordChangeClaim, out var requiresPasswordChange) ||
                        string.IsNullOrWhiteSpace(role) ||
                        string.IsNullOrWhiteSpace(jwtId))
                    {
                        context.Fail("Token inválido.");
                        return;
                    }

                    try
                    {
                        var sessions = context.HttpContext.RequestServices.GetRequiredService<ISessaoService>();
                        var validation = await sessions.ValidarJwtAsync(
                            jwtId,
                            userId,
                            sessionVersion,
                            role,
                            requiresPasswordChange,
                            context.HttpContext.RequestAborted);

                        if (validation.Status == SessaoJwtStatus.Valida && validation.Sessao is not null)
                        {
                            context.Principal?.Identities.FirstOrDefault()?.AddClaim(
                                new Claim(SessaoAutenticacaoDefaults.SessionIdClaim, validation.Sessao.Id.ToString("N")));
                            return;
                        }

                        if (validation.Status != SessaoJwtStatus.SemRegistro
                            || !string.Equals(
                                context.HttpContext.RequestServices.GetRequiredService<IHostEnvironment>().EnvironmentName,
                                "IntegrationTesting",
                                StringComparison.Ordinal))
                        {
                            context.Fail("Token inválido.");
                            return;
                        }

                        // Integrações legadas usam JWTs sintéticos sem registro de sessão.
                        // Em produção, a sessão precisa ter sido emitida e persistida por este serviço.
                        var dbContext = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                        var credentialState = await dbContext.Usuarios
                            .AsNoTracking()
                            .Where(user => user.Id == userId)
                            .Select(user => new { user.Status, user.VersaoSessao })
                            .SingleOrDefaultAsync(context.HttpContext.RequestAborted);

                        if (credentialState is null ||
                            credentialState.Status != LabSolos_Server_DotNet8.Enums.StatusUsuario.Habilitado ||
                            credentialState.VersaoSessao != sessionVersion)
                        {
                            context.Fail("Token inválido.");
                        }
                    }
                    catch (Exception exception) when (SessaoFalhaArmazenamento.IsUnavailable(exception))
                    {
                        context.HttpContext.Items[SessaoAutenticacaoDefaults.StoreUnavailableItem] = true;
                        context.Fail("Sessão indisponível.");
                    }
                },

                OnChallenge = async context =>
                {
                    if (!context.HttpContext.Items.ContainsKey(SessaoAutenticacaoDefaults.StoreUnavailableItem))
                    {
                        return;
                    }

                    context.HandleResponse();
                    context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
                    context.Response.ContentType = "application/problem+json";
                    await context.Response.WriteAsJsonAsync(new
                    {
                        type = "https://httpstatuses.com/503",
                        title = "A sessão não pôde ser verificada.",
                        status = StatusCodes.Status503ServiceUnavailable,
                        code = "session_store_unavailable"
                    });
                }
            };
        })
        .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, SessaoCookieAuthenticationHandler>(
            SessaoAutenticacaoDefaults.CookieScheme,
            _ => { });
    }

    private static void ConfigureAuthorization(IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            var completedPasswordChange = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .RequireClaim(JwtClaimNames.PasswordChangeRequired, "false")
                .Build();
            options.DefaultPolicy = completedPasswordChange;
            options.FallbackPolicy = completedPasswordChange;

            // Políticas baseadas em roles
            options.AddPolicy("ApenasAdministradores", policy =>
                policy.RequireRole("Administrador")
                    .RequireClaim(JwtClaimNames.PasswordChangeRequired, "false"));

            options.AddPolicy("ApenasResponsaveis", policy =>
                policy.RequireRole("Administrador", "Mentor")
                    .RequireClaim(JwtClaimNames.PasswordChangeRequired, "false"));

        });
    }

    private static void InitializeDatabase(WebApplication app)
    {
        using (var startupScope = app.Services.CreateScope())
        {
            var services = startupScope.ServiceProvider;
            var context = services.GetRequiredService<AppDbContext>();

            context.Database.Migrate();

            if (app.Environment.IsDevelopment() || app.Environment.IsProduction())
            {
                DbSeeder.Seed(
                    context,
                    app.Environment.EnvironmentName,
                    app.Configuration,
                    services.GetRequiredService<IPasswordPolicy>());
            }
        }
    }

    private static void ConfigurePipeline(WebApplication app, ConfigurationManager configuration)
    {
        app.UseForwardedHeaders(Program.BuildForwardedHeadersOptions(app.Configuration));

        app.UseRouting();
        app.UseMiddleware<ApiResponseHeadersMiddleware>();
        app.UseMiddleware<ApiErrorContractMiddleware>();
        app.Use(async (context, next) =>
        {
            if (!OperationAdmissionPolicy.IsLimitedJsonWrite(context.Request))
            {
                await next(context);
                return;
            }

            if (context.Request.ContentLength is > OperationAdmissionPolicy.MaximumRequestBodyBytes)
            {
                var response = context.Response;
                AuthenticationProtectionResponses.ApplyNoStore(response);
                response.StatusCode = StatusCodes.Status413PayloadTooLarge;
                response.ContentType = "application/problem+json";
                var problem = ApiErrorContractFilter.CreateProblem(
                    StatusCodes.Status413PayloadTooLarge,
                    context.TraceIdentifier);
                context.Items["ApiErrorCode"] = problem.Extensions["code"];
                await response.WriteAsJsonAsync(
                    problem,
                    options: (System.Text.Json.JsonSerializerOptions?)null,
                    contentType: "application/problem+json",
                    cancellationToken: context.RequestAborted);
                return;
            }

            var bodySizeFeature = context.Features.Get<Microsoft.AspNetCore.Http.Features.IHttpMaxRequestBodySizeFeature>();
            if (bodySizeFeature is { IsReadOnly: false })
            {
                bodySizeFeature.MaxRequestBodySize = OperationAdmissionPolicy.MaximumRequestBodyBytes;
            }

            await next(context);
        });

        if (app.Environment.IsDevelopment())
        {
            app.UseCors("DevelopmentClients");
        }

        // Configurar o pipeline de requisição
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "LabSolos API v1");
                c.RoutePrefix = string.Empty; // Faz o Swagger abrir na raiz
            });

            // Executar o seeding de dados apenas em ambiente de desenvolvimento
        }
        else
        {
            app.UseExceptionHandler("/Error");
        }

        // Middlewares
        if (!app.Environment.IsDevelopment())
        {
            app.UseHttpsRedirection();
            app.UseHsts();
        }

        app.Use(async (context, next) =>
        {
            if (context.Request.Path.StartsWithSegments("/api") && context.GetEndpoint() is null)
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                return;
            }

            await next(context);
        });

        app.UseAuthentication();
        app.Use(async (context, next) =>
        {
            if (!context.Request.Path.StartsWithSegments("/api") ||
                context.User.Identity?.AuthenticationType != SessaoAutenticacaoDefaults.CookieScheme ||
                context.Request.Method is "GET" or "HEAD" or "OPTIONS" or "TRACE" ||
                IsCsrfExemptPublicWrite(context.Request))
            {
                await next(context);
                return;
            }

            var origin = context.Request.Headers.Origin.ToString();
            var requestOrigin = $"{context.Request.Scheme}://{context.Request.Host}";
            var allowedDevelopmentOrigins = app.Environment.IsDevelopment()
                ? Program.GetDevelopmentOrigins(configuration)
                : [];
            var originAllowed = string.Equals(origin, requestOrigin, StringComparison.Ordinal) ||
                allowedDevelopmentOrigins.Contains(origin, StringComparer.Ordinal);
            var sessionCookie = context.Request.Cookies.TryGetValue(
                SessaoAutenticacaoDefaults.CookieName,
                out var cookieValue)
                ? cookieValue
                : null;
            var csrfProof = context.Request.Headers["X-CSRF-Token"].ToString();

            if (!originAllowed || !SessaoCsrfProof.Matches(sessionCookie ?? string.Empty, csrfProof))
            {
                AuthenticationProtectionResponses.ApplyNoStore(context.Response);
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return;
            }

            await next(context);
        });
        app.UseMiddleware<AuditoriaMiddleware>();
        app.UseAuthorization();
        app.MapControllers();
        app.MapHealthChecks("/health", new HealthCheckOptions
        {
            ResponseWriter = static async (context, report) =>
            {
                context.Response.ContentType = "text/plain";
                var status = report.Status == HealthStatus.Healthy ? "ready" : "not_ready";
                await context.Response.WriteAsync(status, context.RequestAborted);
            }
        }).AllowAnonymous();
    }

    private static readonly string[] ValidationErrorMessages = ["Verifique o valor informado."];

    private static bool IsCsrfExemptPublicWrite(HttpRequest request)
    {
        if (!HttpMethods.IsPost(request.Method))
            return false;

        var path = request.Path.Value?.TrimEnd('/');
        return string.Equals(path, "/api/Auth/login", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(path, "/api/Usuarios", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(path, "/api/Email/request-password-reset", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(path, "/api/Email/solicitar-redefinicao", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(path, "/api/Email/reset-password", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(path, "/api/Email/redefinir-senha", StringComparison.OrdinalIgnoreCase);
    }

    private static string[] GetDevelopmentOrigins(ConfigurationManager configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var configuredOrigins = configuration
            .GetSection("AuthenticationProtection:Cors:DevelopmentOrigins")
            .Get<string[]>() ?? [];

        if (configuredOrigins.Any(origin => !IsExactDevelopmentOrigin(origin)))
        {
            throw new InvalidOperationException(
                "AuthenticationProtection:Cors:DevelopmentOrigins must contain exact HTTP or HTTPS origins.");
        }

        return configuredOrigins;
    }

    private static bool IsExactDevelopmentOrigin(string? origin) =>
        !string.IsNullOrWhiteSpace(origin) &&
        origin != "null" &&
        !origin.Contains('*') &&
        Uri.TryCreate(origin, UriKind.Absolute, out var parsedOrigin) &&
        (parsedOrigin.Scheme == Uri.UriSchemeHttp || parsedOrigin.Scheme == Uri.UriSchemeHttps) &&
        !string.IsNullOrEmpty(parsedOrigin.Host) &&
        parsedOrigin.UserInfo.Length == 0 &&
        parsedOrigin.Query.Length == 0 &&
        parsedOrigin.Fragment.Length == 0 &&
        parsedOrigin.AbsolutePath == "/";

    public static ForwardedHeadersOptions BuildForwardedHeadersOptions(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var options = new ForwardedHeadersOptions
        {
            ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
            ForwardLimit = 1
        };
        options.KnownNetworks.Clear();
        options.KnownProxies.Clear();

        var configuredProxies = configuration
            .GetSection("AuthenticationProtection:ForwardedHeaders:KnownProxies")
            .Get<string[]>() ?? [];

        foreach (var configuredProxy in configuredProxies)
        {
            if (!IPAddress.TryParse(configuredProxy, out var proxyAddress) ||
                proxyAddress.Equals(IPAddress.Any) ||
                proxyAddress.Equals(IPAddress.IPv6Any) ||
                !string.Equals(configuredProxy, proxyAddress.ToString(), StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "AuthenticationProtection:ForwardedHeaders:KnownProxies must contain exact IP addresses.");
            }

            options.KnownProxies.Add(proxyAddress);
        }

        return options;
    }
}
