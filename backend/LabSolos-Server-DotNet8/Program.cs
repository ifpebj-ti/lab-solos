using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.Data.Seeds;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Configurar o Swagger para documentação da API
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configurar o Entity Framework Core com SQLite
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Adicionar suporte para controladores
builder.Services.AddControllers();

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

app.UseHttpsRedirection();

// Usar mapeamento top-level para os controladores
app.MapControllers();

app.Run();
