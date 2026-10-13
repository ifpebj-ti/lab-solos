using System.ComponentModel.DataAnnotations;
using System.Data.Common;
using System.Security.Claims;
using AutoMapper;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Usuarios;
using LabSolos_Server_DotNet8.Enums;
using LabSolos_Server_DotNet8.Models;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.JsonPatch.Operations;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;

namespace LabSolos_Server_DotNet8.Services.Security;

public enum UserProfileUpdateStatus
{
    Updated,
    NotFound,
    Forbidden,
    Invalid,
    Conflict,
    Unavailable
}

public sealed record UserProfileUpdateResult(
    UserProfileUpdateStatus Status,
    IReadOnlyDictionary<string, string[]>? Errors = null,
    Usuario? UpdatedUser = null)
{
    public static UserProfileUpdateResult Updated(Usuario user) =>
        new(UserProfileUpdateStatus.Updated, UpdatedUser: user);

    public static UserProfileUpdateResult NotFound() => new(UserProfileUpdateStatus.NotFound);

    public static UserProfileUpdateResult Forbidden() => new(UserProfileUpdateStatus.Forbidden);

    public static UserProfileUpdateResult Invalid(string field, string code, string message) =>
        new(UserProfileUpdateStatus.Invalid, new Dictionary<string, string[]>(StringComparer.Ordinal)
        {
            [field] = [code, message]
        });

    public static UserProfileUpdateResult Conflict() => new(UserProfileUpdateStatus.Conflict);

    public static UserProfileUpdateResult Unavailable() => new(UserProfileUpdateStatus.Unavailable);
}

public sealed class UserProfileUpdateService
{
    private const int MaximumPatchOperations = 10;
    private const string EmailConflictCode = "profile_update_conflict";
    private static readonly HashSet<string> PersistentPaths = new(StringComparer.Ordinal)
    {
        "/nomeCompleto",
        "/email",
        "/telefone",
        "/status"
    };
    private static readonly HashSet<string> ReplaceablePaths = new(PersistentPaths, StringComparer.Ordinal)
    {
        "/senhaAtual"
    };

    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly IPasswordHasher<Usuario> _passwordHasher;
    private readonly ThrottleKeyFactory? _throttleKeyFactory;

    public UserProfileUpdateService(
        AppDbContext context,
        IMapper mapper,
        IPasswordHasher<Usuario> passwordHasher,
        ThrottleKeyFactory? throttleKeyFactory = null)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _passwordHasher = passwordHasher ?? throw new ArgumentNullException(nameof(passwordHasher));
        _throttleKeyFactory = throttleKeyFactory;
    }

    public async Task<UserProfileUpdateResult> UpdateAsync(
        int userId,
        ClaimsPrincipal principal,
        JsonPatchDocument<UsuarioDTOPatchRequest> patch,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(principal);
        ArgumentNullException.ThrowIfNull(patch);

        if (!_context.Database.IsRelational())
        {
            throw new InvalidOperationException("Profile updates require transactional relational storage.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            if (!await LockUserAsync(userId, transaction, cancellationToken))
            {
                return await RollbackAsync(transaction, UserProfileUpdateResult.NotFound(), cancellationToken);
            }

            var user = await _context.Usuarios.SingleOrDefaultAsync(
                candidate => candidate.Id == userId,
                cancellationToken);
            if (user is null)
            {
                return await RollbackAsync(transaction, UserProfileUpdateResult.NotFound(), cancellationToken);
            }

            var isAdministrator = principal.IsInRole(NivelUsuario.Administrador.ToString());
            if (!isAdministrator && (!TryGetCallerId(principal, out var callerId) || callerId != user.Id))
            {
                return await RollbackAsync(transaction, UserProfileUpdateResult.NotFound(), cancellationToken);
            }

            var patchValidation = ValidateOperations(patch, isAdministrator);
            if (patchValidation is not null)
            {
                return await RollbackAsync(transaction, patchValidation, cancellationToken);
            }

            var patchRequest = _mapper.Map<UsuarioDTOPatchRequest>(user);
            string? patchError = null;
            patch.ApplyTo(patchRequest, error => patchError = error.ErrorMessage);
            if (patchError is not null)
            {
                return await RollbackAsync(
                    transaction,
                    UserProfileUpdateResult.Invalid("patch", "invalid_patch", "O documento de alteração é inválido."),
                    cancellationToken);
            }

            var validation = ValidatePatchedProfile(patchRequest);
            if (validation is not null)
            {
                return await RollbackAsync(transaction, validation, cancellationToken);
            }

            var previousEmail = user.Email;
            var emailChanged = !string.Equals(previousEmail, patchRequest.Email, StringComparison.Ordinal);
            var isOwnProfile = TryGetCallerId(principal, out var ownerId) && ownerId == user.Id;
            if (emailChanged && isOwnProfile && !HasCorrectCurrentPassword(user, patchRequest.SenhaAtual))
            {
                return await RollbackAsync(
                    transaction,
                    UserProfileUpdateResult.Invalid(
                        "senhaAtual",
                        "current_password_invalid",
                        "Confirme a senha atual para alterar o e-mail."),
                    cancellationToken);
            }

            if (emailChanged && (_throttleKeyFactory is null || _throttleKeyFactory.IsSynthetic))
            {
                return await RollbackAsync(transaction, UserProfileUpdateResult.Unavailable(), cancellationToken);
            }

            if (emailChanged && await _context.Usuarios.AnyAsync(
                    candidate => candidate.Id != user.Id && candidate.Email == patchRequest.Email,
                    cancellationToken))
            {
                return await RollbackAsync(transaction, UserProfileUpdateResult.Conflict(), cancellationToken);
            }

            _mapper.Map(patchRequest, user);
            if (emailChanged)
            {
                user.TokenRedefinicaoHash = null;
                user.TokenExpiracao = null;
            }

            await _context.SaveChangesAsync(cancellationToken);
            if (emailChanged)
            {
                await CancelRecoveryJobsAsync(user.Id, previousEmail, transaction, cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
            return UserProfileUpdateResult.Updated(user);
        }
        catch (DbUpdateException exception) when (IsEmailUniqueViolation(exception))
        {
            await transaction.RollbackAsync(cancellationToken);
            _context.ChangeTracker.Clear();
            return UserProfileUpdateResult.Conflict();
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync(cancellationToken);
            _context.ChangeTracker.Clear();
            return UserProfileUpdateResult.Conflict();
        }
    }

    private static UserProfileUpdateResult? ValidateOperations(
        JsonPatchDocument<UsuarioDTOPatchRequest> patch,
        bool isAdministrator)
    {
        if (patch.Operations.Count is < 1 or > MaximumPatchOperations)
        {
            return InvalidPatch();
        }

        var currentPasswordOperations = 0;
        foreach (var operation in patch.Operations)
        {
            var path = operation.path;
            var isReplace = operation.OperationType == OperationType.Replace;
            var isTest = operation.OperationType == OperationType.Test;
            if (!string.IsNullOrEmpty(operation.from) ||
                path is null ||
                (isReplace && !ReplaceablePaths.Contains(path)) ||
                (isTest && !PersistentPaths.Contains(path)) ||
                (!isReplace && !isTest))
            {
                return InvalidPatch();
            }

            if (string.Equals(path, "/senhaAtual", StringComparison.Ordinal))
            {
                currentPasswordOperations++;
                if (currentPasswordOperations > 1)
                {
                    return InvalidPatch();
                }
            }

            if (!isAdministrator && string.Equals(path, "/status", StringComparison.Ordinal))
            {
                return UserProfileUpdateResult.Forbidden();
            }
        }

        return null;
    }

    private static UserProfileUpdateResult? ValidatePatchedProfile(UsuarioDTOPatchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NomeCompleto))
        {
            return UserProfileUpdateResult.Invalid("nomeCompleto", "name_required", "O nome é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(request.Email) ||
            request.Email.Length > 254 ||
            !string.Equals(request.Email, request.Email.Trim(), StringComparison.Ordinal) ||
            !new EmailAddressAttribute().IsValid(request.Email))
        {
            return UserProfileUpdateResult.Invalid("email", "email_invalid", "Informe um e-mail válido.");
        }

        if (request.Status is null || !Enum.TryParse<StatusUsuario>(request.Status, ignoreCase: false, out var status) ||
            !Enum.IsDefined(status))
        {
            return UserProfileUpdateResult.Invalid("status", "status_invalid", "O status informado é inválido.");
        }

        return null;
    }

    private bool HasCorrectCurrentPassword(Usuario user, string? currentPassword)
    {
        if (string.IsNullOrEmpty(currentPassword))
        {
            return false;
        }

        var result = _passwordHasher.VerifyHashedPassword(user, user.SenhaHash, currentPassword);
        return result is PasswordVerificationResult.Success or PasswordVerificationResult.SuccessRehashNeeded;
    }

    private async Task CancelRecoveryJobsAsync(
        int userId,
        string previousEmail,
        IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        await LockRecoveryJobCapacityAsync(transaction, cancellationToken);
        var oldDeliveryKey = _throttleKeyFactory!.CreateRecoveryDeliveryKey(previousEmail);
        var cancelledJobs = await _context.PasswordRecoveryJobs
            .Where(job => (job.UserId == userId || job.DeliveryKeyHash == oldDeliveryKey) &&
                (job.Status == PasswordRecoveryJobStatus.Pending ||
                 job.Status == PasswordRecoveryJobStatus.Processing))
            .ExecuteUpdateAsync(updates => updates
                .SetProperty(job => job.Status, PasswordRecoveryJobStatus.Cancelled)
                .SetProperty(job => job.LeaseId, (Guid?)null)
                .SetProperty(job => job.LeaseUntil, (DateTimeOffset?)null)
                .SetProperty(job => job.PayloadCiphertext, Array.Empty<byte>())
                .SetProperty(job => job.PayloadNonce, new byte[12])
                .SetProperty(job => job.PayloadTag, new byte[16])
                .SetProperty(job => job.EncryptionKeyId, string.Empty),
                cancellationToken);

        if (cancelledJobs == 0)
        {
            return;
        }

        var updatedCapacity = await _context.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE \"AuthenticationProtectionCapacity\" SET \"Allocated\" = \"Allocated\" - {cancelledJobs} WHERE \"Scope\" = {AuthenticationProtectionCapacity.RecoveryJobs} AND \"Allocated\" >= {cancelledJobs}",
            cancellationToken);
        if (updatedCapacity != 1)
        {
            throw new InvalidOperationException("Recovery queue capacity is inconsistent.");
        }
    }

    private static async Task<bool> LockUserAsync(
        int userId,
        IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(transaction, "SELECT 1 FROM \"Usuarios\" WHERE \"Id\" = @userId FOR UPDATE;");
        AddParameter(command, "userId", userId);
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is not null and not DBNull;
    }

    private static async Task LockRecoveryJobCapacityAsync(
        IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(
            transaction,
            "SELECT \"Allocated\" FROM \"AuthenticationProtectionCapacity\" WHERE \"Scope\" = @scope FOR UPDATE;");
        AddParameter(command, "scope", AuthenticationProtectionCapacity.RecoveryJobs);
        if (await command.ExecuteScalarAsync(cancellationToken) is null or DBNull)
        {
            throw new InvalidOperationException("Recovery queue capacity is not initialized.");
        }
    }

    private static DbCommand CreateCommand(IDbContextTransaction transaction, string commandText)
    {
        var command = transaction.GetDbTransaction().Connection!.CreateCommand();
        command.Transaction = transaction.GetDbTransaction();
        command.CommandText = commandText;
        return command;
    }

    private static void AddParameter(DbCommand command, string name, object value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = value;
        command.Parameters.Add(parameter);
    }

    private static bool TryGetCallerId(ClaimsPrincipal principal, out int userId)
    {
        userId = 0;
        if (principal.Identity?.IsAuthenticated != true)
        {
            return false;
        }

        var subjects = principal.Claims
            .Where(claim => claim.Type is ClaimTypes.NameIdentifier or "sub")
            .Select(claim => claim.Value)
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        return subjects.Length == 1 &&
            int.TryParse(subjects[0], System.Globalization.NumberStyles.None,
                System.Globalization.CultureInfo.InvariantCulture, out userId) &&
            userId > 0;
    }

    private static bool IsEmailUniqueViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
            ConstraintName: "IX_Usuarios_Email"
        };

    private static UserProfileUpdateResult InvalidPatch() =>
        UserProfileUpdateResult.Invalid("patch", "invalid_patch", "O documento de alteração é inválido.");

    private static async Task<UserProfileUpdateResult> RollbackAsync(
        IDbContextTransaction transaction,
        UserProfileUpdateResult result,
        CancellationToken cancellationToken)
    {
        await transaction.RollbackAsync(cancellationToken);
        return result;
    }
}
