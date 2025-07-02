using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Data.Seeds;
using LabSolos_Server_DotNet8.Filters;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using LabSolos_Server_DotNet8.BackgroundServices;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using LabSolos_Server_DotNet8.Middlewares;

var builder = WebApplication.CreateBuilder(args);

// Adicionar suporte para controladores
builder.Services.AddControllers(options =>
{
    options.Filters.Add(typeof(ApiLoggingFilter));
    options.Filters.Add(typeof(ApiExceptionFilter));
})
.AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
}).AddNewtonsoftJson(options =>
{
    options.SerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore;
});

// Configuração de algumas dependẽncias
builder.Services.AddSingleton<JwtService>();

builder.Services.AddScoped<IEmailService, EmailService>();

builder.Services.AddScoped<IUsuarioService, UsuarioService>();
builder.Services.AddScoped<IProdutoService, ProdutoService>();
builder.Services.AddScoped<ILoteService, LoteService>();
builder.Services.AddScoped<IUtilitiesService, UtilitiesService>();
builder.Services.AddScoped<ISystemService, SystemService>();
builder.Services.AddScoped<INotificacaoService, NotificacaoService>();
builder.Services.AddScoped<IAuditoriaService, AuditoriaService>();

builder.Services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());

builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

// Adicionar o background service para verificação de empréstimos vencidos
builder.Services.AddHostedService<EmprestimosVencidosBackgroundService>();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PostgresConnection")));

// Configurar o Swagger para documentação da API
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configurar JWT
var jwtSettings = builder.Configuration.GetSection("Jwt");
var keyString = jwtSettings["Key"];

if (string.IsNullOrEmpty(keyString))
{
    throw new InvalidOperationException("Chave JWT ausente. Verifique suas variáveis de ambiente ou o arquivo appsettings.json.");
}

var key = Encoding.UTF8.GetBytes(keyString);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ClockSkew = TimeSpan.Zero,
        RoleClaimType = ClaimTypes.Role
    };
});

builder.Services.AddAuthorization(options =>
{
    // Políticas baseadas em roles
    options.AddPolicy("ApenasAdministradores", policy =>
        policy.RequireRole("Administrador"));

    options.AddPolicy("ApenasResponsaveis", policy =>
        policy.RequireRole("Administrador", "Mentor"));

    options.AddPolicy("ApenasDependentes", policy =>
        policy.RequireRole("Mentorado"));
});

// Configurar CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy.AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

var app = builder.Build();

// Configurar o pipeline de requisição
if (app.Environment.IsDevelopment() || app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "LabSolos API v1");
        c.RoutePrefix = string.Empty; // Faz o Swagger abrir na raiz
    });

    // Executar o seeding de dados apenas em ambiente de desenvolvimento
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<AppDbContext>();

    context.Database.EnsureCreated();

    DbSeeder.Seed(context, app.Environment.EnvironmentName);
}
else
{
    app.UseExceptionHandler("/Error");
}

app.UseCors("AllowAll");

// Middlewares
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
    app.UseHsts();
}

app.UseAuthentication();
app.UseMiddleware<AuditoriaMiddleware>();
app.UseAuthorization();
app.MapControllers();

app.Run();