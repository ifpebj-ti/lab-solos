using System.Text;
using System.Text.Json.Serialization;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Data.Seeds;
using LabSolos_Server_DotNet8.Filters;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configurar o Serilog para escrever os logs em um arquivo
Log.Logger = new LoggerConfiguration()
    .WriteTo.File("Logs/General/general-log-.log", rollingInterval: RollingInterval.Day) // Logs diários em "Logs/log.txt"
    .WriteTo.Logger(lc => lc
                .Filter.ByIncludingOnly(e => e.Properties["SourceContext"].ToString().Contains("Core.Filters.ApiLoggingFilter"))
                .WriteTo.File("Logs/Actions/action-log-.log", rollingInterval: RollingInterval.Day)) // Logs do ApiLoggingFilter
    .WriteTo.Logger(lc => lc
                .Filter.ByIncludingOnly(e => e.Properties["SourceContext"].ToString().Contains("Core.Filters.ApiExceptionFilter"))
                .WriteTo.File("Logs/Exceptions/exception-log-.log", rollingInterval: RollingInterval.Day)) // Logs do ApiExceptionFilter
    .CreateLogger();

// Substituir o logger padrão do ASP.NET Core pelo Serilog
builder.Host.UseSerilog();

// Configuração de algumas dependẽncias
builder.Services.AddSingleton<JwtService>();

builder.Services.AddScoped<IUsuarioService, UsuarioService>();
builder.Services.AddScoped<IProdutoService, ProdutoService>();
builder.Services.AddScoped<ILoteService, LoteService>();
builder.Services.AddScoped<IUtilitiesService, UtilitiesService>();
builder.Services.AddScoped<ISystemService, SystemService>();
builder.Services.AddScoped<IEmprestimoService, EmprestimoService>();


builder.Services.AddScoped<IUsuarioRepository, UsuarioRepository>();
builder.Services.AddScoped<IProdutoRepository, ProdutoRepository>();
builder.Services.AddScoped<ILoteRepository, LoteRepository>();
builder.Services.AddScoped<IEmprestimoRepository, EmprestimoRepository>();


// Adicionar suporte para controladores
builder.Services.AddControllers(options =>
{
    options.Filters.Add(typeof(ApiLoggingFilter));
    options.Filters.Add(typeof(ApiExceptionFilter));
})
.AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

// Configurar o Swagger para documentação da API
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


// Configurar JWT
var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.ASCII.GetBytes(jwtSettings["Key"]!);

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
        ClockSkew = TimeSpan.Zero // Evitar atrasos na expiração
    };
});

builder.Services.AddAuthorization();

// Configurar CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy.AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

// Configurar o Entity Framework Core com SQLite
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("SQLiteConnection")));

var app = builder.Build();

// Configurar o pipeline de requisição
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Minha API v1");
        c.RoutePrefix = string.Empty; // Faz o Swagger abrir na raiz
    });

    // Executar o seeding de dados apenas em ambiente de desenvolvimento
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<AppDbContext>();
    context.Database.EnsureCreated(); // Garante que o banco de dados está criado

    // Chama o método de seeding que utiliza o contexto
    DbSeeder.Seed(context);
}
else
{
    app.UseExceptionHandler("/Error");
}

app.UseCors("AllowAll");

app.UseSerilogRequestLogging(); // Configura o Serilog para registrar automaticamente todas as requisições HTTP feitas à aplicação
app.UseHttpsRedirection(); // Força o redirecionamento de todas as requisições HTTP para HTTPS, garantindo que as comunicações sejam feitas em uma conexão segura e criptografada
app.UseAuthentication(); // Adiciona a autenticação ao pipeline
app.UseAuthorization(); // Verifica as permissões de um usuário autenticado, permitindo o acesso a recursos específicos da aplicação com base em regras definidas
app.MapControllers(); // Configura o roteamento para todos os controladores da aplicação, registrando automaticamente as rotas definidas nos atributos [HttpGet], [HttpPost], etc.

app.Run();
