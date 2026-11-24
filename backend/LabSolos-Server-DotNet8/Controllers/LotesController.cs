using AutoMapper;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Lotes;
using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using LabSolos_Server_DotNet8.Repositories;
using LabSolos_Server_DotNet8.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace LabSolos_Server_DotNet8.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LoteController(
    ILoteService loteService, IUnitOfWork uow, IMapper mapper, AppDbContext context) : ControllerBase
{
    [HttpPost("AddLote")]
    [Authorize("ApenasAdministradores")]
    public async Task<IActionResult> AdicionarLote([FromBody] AddLoteDTO dto)
    {
        var validation = loteService.ValidarEstruturaLote(dto);
        if (!validation.Validado)
            return InvalidFields(validation.ErrosPorCampo!);

        await using var transaction = await uow.BeginTransactionAsync(HttpContext.RequestAborted);
        await uow.LockProductsForMutationAsync(dto.ProdutoIds!, HttpContext.RequestAborted);
        var ids = dto.ProdutoIds!;
        var products = await context.Produtos.Where(product => ids.Contains(product.Id)).ToListAsync();
        if (products.Count != ids.Length || products.Any(product => product.Desativado ||
                product.Tipo != Enum.Parse<TipoProduto>(dto.Tipo, true)))
            return InvalidFields(new() { ["produtoIds"] = ["Selecione produtos existentes, ativos e do tipo informado."] });
        if (products.Any(product => product.LoteId.HasValue))
            return ConflictProblem("produtoIds", "Os produtos selecionados já possuem um lote corrente.");

        var lot = mapper.Map<Lote>(dto);
        lot.Produtos = products;
        context.Lotes.Add(lot);
        try
        {
            await uow.CommitAsync();
            await transaction.CommitAsync(HttpContext.RequestAborted);
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException
            { SqlState: PostgresErrorCodes.UniqueViolation, ConstraintName: "UX_Lotes_CodigoNormalizado" })
        {
            await transaction.RollbackAsync(HttpContext.RequestAborted);
            context.ChangeTracker.Clear();
            return ConflictProblem("codigoLote", "Já existe um lote com o código informado.");
        }
        return CreatedAtAction(nameof(ObterLotePeloCodigo), new { codigoLote = lot.CodigoLote }, Project(lot));
    }

    [HttpGet("GetById/{id}")]
    [Authorize]
    public async Task<IActionResult> ObterLotePeloId(int id)
    {
        var lot = await new LoteRepository(context).GetLoteByIdAsync(id);
        return lot is null ? NotFound() : Ok(Project(lot));
    }

    [HttpGet("GetByCodigo/{codigoLote}")]
    [Authorize]
    public async Task<IActionResult> ObterLotePeloCodigo(string codigoLote)
    {
        var lot = await new LoteRepository(context).GetLoteByCodigoAsync(codigoLote);
        return lot is null ? NotFound() : Ok(Project(lot));
    }

    private LoteDTO Project(Lote lot)
    {
        var result = mapper.Map<LoteDTO>(lot);
        result.Produtos = (lot.Produtos ?? []).OrderBy(product => product.Id).Select(product =>
        {
            var item = mapper.Map<ProdutoDTO>(product);
            item.Lote = null;
            return item;
        }).ToList();
        return result;
    }

    private BadRequestObjectResult InvalidFields(Dictionary<string, string[]> fields)
    {
        var problem = new ValidationProblemDetails(fields)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Revise os campos indicados para cadastrar o lote."
        };
        problem.Extensions["code"] = "validation_failed";
        return BadRequest(problem);
    }

    private ConflictObjectResult ConflictProblem(string field, string guidance)
    {
        var problem = new ProblemDetails { Status = StatusCodes.Status409Conflict, Title = guidance };
        problem.Extensions["code"] = "operation_conflict";
        problem.Extensions["errors"] = new Dictionary<string, string[]> { [field] = [guidance] };
        return Conflict(problem);
    }
}
