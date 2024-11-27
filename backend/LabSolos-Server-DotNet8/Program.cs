using System.Text;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Data.Seeds;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Events;

var builder = WebApplication.CreateBuilder(args);

// Configuração do sistema de logs
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information() // Serão mostrados logs a partir do nível selecionado (Verbose - Debug - Information - Warning - Error - Fatal)
    .WriteTo.Console() // Permite que os logs sejam escritos no terminal
    .WriteTo.File("Logs/log.txt", rollingInterval: RollingInterval.Month) // Caminho onde deverá estar o arquivo e periodicidade dos arquivos (Hour - Day - Month - Infinite)
    .CreateLogger();

builder.Host.UseSerilog(); 

// Configuração de algumas dependẽncias
builder.Services.AddSingleton<JwtService>();
builder.Services.AddScoped<IUsuarioService, UsuarioService>();
builder.Services.AddScoped<IUsuarioRepository, UsuarioRepository>();
builder.Services.AddScoped<IProdutoService, ProdutoService>();
builder.Services.AddScoped<IProdutoRepository, ProdutoRepository>();

// Adicionar suporte para controladores
builder.Services.AddControllers();

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
    app.UseSwaggerUI();

    // Executar o seeding de dados apenas em ambiente de desenvolvimento
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<AppDbContext>();
    context.Database.EnsureCreated(); // Garante que o banco de dados está criado

    // Chama o método de seeding que utiliza o contexto
    DbSeeder.Seed(context);
}

app.UseCors("AllowAll");

app.UseSerilogRequestLogging(); // Configura o Serilog para registrar automaticamente todas as requisições HTTP feitas à aplicação
app.UseHttpsRedirection(); // Força o redirecionamento de todas as requisições HTTP para HTTPS, garantindo que as comunicações sejam feitas em uma conexão segura e criptografada
app.UseAuthentication(); // Adiciona a autenticação ao pipeline
app.UseAuthorization(); // Verifica as permissões de um usuário autenticado, permitindo o acesso a recursos específicos da aplicação com base em regras definidas
app.MapControllers(); // Configura o roteamento para todos os controladores da aplicação, registrando automaticamente as rotas definidas nos atributos [HttpGet], [HttpPost], etc.

app.Run();
