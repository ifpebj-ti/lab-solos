using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Produtos;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.EntityFrameworkCore;

namespace LabSolos_Server_DotNet8.Services.Security;

public sealed class ProductHistoryAccessService(
    AppDbContext context,
    ProductEffectiveOutflowQuery outflowQuery)
{
    public async Task<HistoricoSaidaProdutoResponseDTO?> GetHistoryAsync(
        int productId,
        ClaimsPrincipal? principal,
        CancellationToken cancellationToken = default)
    {
        if (productId <= 0 || !TryGetActorId(principal, out var actorId))
        {
            return null;
        }

        var actor = await context.Usuarios
            .AsNoTracking()
            .Where(user => user.Id == actorId)
            .Select(user => new { user.Id, user.NivelUsuario, user.Status })
            .SingleOrDefaultAsync(cancellationToken);
        if (actor is null ||
            actor.Status != StatusUsuario.Habilitado ||
            actor.NivelUsuario is not (NivelUsuario.Administrador or NivelUsuario.Mentor or NivelUsuario.Mentorado))
        {
            return null;
        }

        if (actor.NivelUsuario != NivelUsuario.Administrador)
        {
            var relatedLoans = context.Emprestimos
                .AsNoTracking()
                .Where(loan => loan.Produtos.Any(item => item.ProdutoId == productId));

            relatedLoans = actor.NivelUsuario switch
            {
                NivelUsuario.Mentor => relatedLoans.Where(loan =>
                    loan.SolicitanteId == actor.Id ||
                    (loan.Solicitante.NivelUsuario == NivelUsuario.Mentorado &&
                     loan.Solicitante.ResponsavelId == actor.Id)),
                NivelUsuario.Mentorado => relatedLoans.Where(loan => loan.SolicitanteId == actor.Id),
                _ => relatedLoans.Where(_ => false)
            };

            if (!await relatedLoans.AnyAsync(cancellationToken))
            {
                return null;
            }
        }

        var product = await context.Produtos
            .AsNoTracking()
            .Where(candidate => candidate.Id == productId)
            .Select(candidate => new ProductHistoryMetadata(
                candidate.Id,
                candidate.NomeProduto,
                candidate.Tipo,
                candidate.UnidadeMedida))
            .SingleOrDefaultAsync(cancellationToken);
        if (product is null)
        {
            return null;
        }

        var source = await outflowQuery.QueryForProductAsync(productId, cancellationToken);
        var outflowLoanIds = source.Outflows
            .Select(outflow => outflow.EmprestimoId)
            .Distinct()
            .ToArray();

        var requesters = new List<LoanRequester>();
        if (outflowLoanIds.Length > 0)
        {
            var scopedLoans = context.Emprestimos
                .AsNoTracking()
                .Where(loan => outflowLoanIds.Contains(loan.Id));

            scopedLoans = actor.NivelUsuario switch
            {
                NivelUsuario.Administrador => scopedLoans,
                NivelUsuario.Mentor => scopedLoans.Where(loan =>
                    loan.SolicitanteId == actor.Id ||
                    (loan.Solicitante.NivelUsuario == NivelUsuario.Mentorado &&
                     loan.Solicitante.ResponsavelId == actor.Id)),
                NivelUsuario.Mentorado => scopedLoans.Where(loan => loan.SolicitanteId == actor.Id),
                _ => scopedLoans.Where(_ => false)
            };

            requesters = await scopedLoans
                .Select(loan => new LoanRequester(
                    loan.Id,
                    loan.SolicitanteId,
                    loan.Solicitante.NivelUsuario,
                    loan.Solicitante.ResponsavelId,
                    loan.Solicitante.NomeCompleto))
                .ToListAsync(cancellationToken);
        }

        var requesterByLoanId = requesters.ToDictionary(requester => requester.EmprestimoId);
        var history = source.Outflows
            .Where(outflow => requesterByLoanId.ContainsKey(outflow.EmprestimoId))
            .Select(outflow =>
            {
                var requester = requesterByLoanId[outflow.EmprestimoId];
                var canSeeRequesterName = actor.NivelUsuario == NivelUsuario.Administrador ||
                    (actor.NivelUsuario == NivelUsuario.Mentor &&
                     requester.NivelUsuario == NivelUsuario.Mentorado &&
                     requester.ResponsavelId == actor.Id);

                return new HistoricoSaidaProdutoDTO
                {
                    EmprestimoId = outflow.EmprestimoId,
                    DataSaida = outflow.Instante,
                    QuantidadeEmprestada = outflow.Quantidade,
                    UnidadeMedida = product.UnidadeMedida.ToString(),
                    Lote = outflow.CodigoLote,
                    SolicitanteNome = canSeeRequesterName ? requester.NomeCompleto : null
                };
            })
            .OrderByDescending(line => line.DataSaida)
            .ThenBy(line => line.EmprestimoId)
            .ToList();

        return new HistoricoSaidaProdutoResponseDTO
        {
            ProdutoId = product.Id,
            NomeProduto = product.NomeProduto,
            TipoProduto = product.Tipo.ToString(),
            UnidadeMedida = product.UnidadeMedida.ToString(),
            Historico = history,
            TotalEmprestimos = history.Count,
            TotalQuantidadeEmprestada = history.Sum(line => (decimal)line.QuantidadeEmprestada)
        };
    }

    private static bool TryGetActorId(ClaimsPrincipal? principal, out int actorId)
    {
        actorId = 0;
        if (principal?.Identity?.IsAuthenticated != true)
        {
            return false;
        }

        var subjectValues = principal.Claims
            .Where(claim => claim.Type is ClaimTypes.NameIdentifier or JwtRegisteredClaimNames.Sub)
            .Select(claim => claim.Value)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        return subjectValues.Length == 1 &&
            int.TryParse(subjectValues[0], NumberStyles.None, CultureInfo.InvariantCulture, out actorId) &&
            actorId > 0;
    }

    private sealed record ProductHistoryMetadata(
        int Id,
        string NomeProduto,
        TipoProduto Tipo,
        UnidadeMedida UnidadeMedida);

    private sealed record LoanRequester(
        int EmprestimoId,
        int SolicitanteId,
        NivelUsuario NivelUsuario,
        int? ResponsavelId,
        string NomeCompleto);
}
