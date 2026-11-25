using System.ComponentModel.DataAnnotations;
using System.Data.Common;
using System.Security.Claims;
using AutoMapper;
using LabSolos_Server_DotNet8.Data.Context;
using LabSolos_Server_DotNet8.DTOs.Auditoria;
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
    ContinuityRequired,
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
    private sealed record AuthorizedProfileUser(
        Usuario? User,
        UserProfileUpdateResult? Failure,
        int CallerId,
        bool HasCallerId,
        bool IsAdministrator);

    private sealed record PreparedProfilePatch(
        UsuarioDTOPatchRequest? Request,
        UserProfileUpdateResult? Failure,
        string PreviousEmail,
        bool EmailChanged);

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
    private readonly AdminContinuityGuard _continuityGuard;
    private readonly EmailAddressReservationService? _emailAddressReservations;
    private readonly IAuditoriaService? _auditoriaService;

    public UserProfileUpdateService(
        AppDbContext context,
        IMapper mapper,
        IPasswordHasher<Usuario> passwordHasher,
        AdminContinuityGuard continuityGuard,
        ThrottleKeyFactory? throttleKeyFactory = null,
        EmailAddressReservationService? emailAddressReservations = null,
        IAuditoriaService? auditoriaService = null)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _passwordHasher = passwordHasher ?? throw new ArgumentNullException(nameof(passwordHasher));
        _continuityGuard = continuityGuard ?? throw new ArgumentNullException(nameof(continuityGuard));
        _throttleKeyFactory = throttleKeyFactory;
        _emailAddressReservations = emailAddressReservations;
        _auditoriaService = auditoriaService;
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

        await using var transaction = await _continuityGuard.BeginTransactionAsync(cancellationToken);
        try
        {
            var access = await LockAndLoadAuthorizedUserAsync(
                userId, principal, transaction, cancellationToken);
            if (access.Failure is not null)
                return await RollbackAsync(transaction, access.Failure, cancellationToken);

            var user = access.User!;
            var prepared = PreparePatch(user, patch, access.IsAdministrator);
            if (prepared.Failure is not null)
                return await RollbackAsync(transaction, prepared.Failure, cancellationToken);

            var patchRequest = prepared.Request!;
            var emailFailure = await ValidateEmailChangeAsync(
                user, patchRequest, access, prepared.EmailChanged, cancellationToken);
            if (emailFailure is not null)
                return await RollbackAsync(transaction, emailFailure, cancellationToken);

            if (!await _continuityGuard.CanApplyAsync(user.Id, user.NivelUsuario,
                    Enum.Parse<StatusUsuario>(patchRequest.Status!), cancellationToken: cancellationToken))
            {
                return await RollbackAsync(transaction,
                    new UserProfileUpdateResult(UserProfileUpdateStatus.ContinuityRequired), cancellationToken);
            }

            await PersistPatchAsync(
                user,
                patchRequest,
                prepared.PreviousEmail,
                prepared.EmailChanged,
                access.CallerId,
                transaction,
                cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return UserProfileUpdateResult.Updated(user);
        }
        catch (DbUpdateException exception) when (IsEmailRelatedUniqueViolation(exception))
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
        catch (InvalidOperationException exception) when (
            exception.Message == "The former email address is reserved by another account.")
        {
            await transaction.RollbackAsync(cancellationToken);
            _context.ChangeTracker.Clear();
            return UserProfileUpdateResult.Conflict();
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(cancellationToken);
            _context.ChangeTracker.Clear();
            return UserProfileUpdateResult.Unavailable();
        }
    }

    private async Task<AuthorizedProfileUser> LockAndLoadAuthorizedUserAsync(
        int userId,
        ClaimsPrincipal principal,
        IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        var isAdministrator = principal.IsInRole(NivelUsuario.Administrador.ToString());
        var hasCallerId = TryGetCallerId(principal, out var callerId);
        var idsToLock = isAdministrator && hasCallerId
            ? new[] { userId, callerId }.Distinct().Order().ToArray()
            : [userId];
        foreach (var idToLock in idsToLock)
        {
            if (!await LockUserAsync(idToLock, transaction, cancellationToken))
            {
                var failure = idToLock == userId
                    ? UserProfileUpdateResult.NotFound()
                    : UserProfileUpdateResult.Forbidden();
                return new(null, failure, callerId, hasCallerId, isAdministrator);
            }
        }

        var user = await _context.Usuarios.SingleOrDefaultAsync(
            candidate => candidate.Id == userId,
            cancellationToken);
        if (user is null)
            return new(null, UserProfileUpdateResult.NotFound(), callerId, hasCallerId, isAdministrator);

        await _context.Entry(user).ReloadAsync(cancellationToken);
        if (!isAdministrator && (!hasCallerId || callerId != user.Id))
            return new(null, UserProfileUpdateResult.NotFound(), callerId, hasCallerId, isAdministrator);

        return new(user, null, callerId, hasCallerId, isAdministrator);
    }

    private PreparedProfilePatch PreparePatch(
        Usuario user,
        JsonPatchDocument<UsuarioDTOPatchRequest> patch,
        bool isAdministrator)
    {
        var patchValidation = ValidateOperations(patch, isAdministrator);
        if (patchValidation is not null)
            return new(null, patchValidation, user.Email, false);

        var patchRequest = _mapper.Map<UsuarioDTOPatchRequest>(user);
        string? patchError = null;
        patch.ApplyTo(patchRequest, error => patchError = error.ErrorMessage);
        if (patchError is not null)
        {
            return new(null,
                UserProfileUpdateResult.Invalid("patch", "invalid_patch", "O documento de alteração é inválido."),
                user.Email,
                false);
        }

        if (!string.IsNullOrWhiteSpace(patchRequest.Email))
            patchRequest.Email = EmailAddressReservationService.Normalize(patchRequest.Email);

        var validation = ValidatePatchedProfile(patchRequest);
        if (validation is not null)
            return new(null, validation, user.Email, false);

        var previousEmail = user.Email;
        var emailChanged = !string.Equals(
            EmailAddressReservationService.Normalize(previousEmail),
            patchRequest.Email,
            StringComparison.Ordinal);
        if (!emailChanged)
            patchRequest.Email = previousEmail;

        return new(patchRequest, null, previousEmail, emailChanged);
    }

    private async Task<UserProfileUpdateResult?> ValidateEmailChangeAsync(
        Usuario user,
        UsuarioDTOPatchRequest patchRequest,
        AuthorizedProfileUser access,
        bool emailChanged,
        CancellationToken cancellationToken)
    {
        if (!emailChanged)
            return null;

        var confirmer = access.HasCallerId
            ? access.CallerId == user.Id
                ? user
                : await _context.Usuarios.SingleOrDefaultAsync(
                    candidate => candidate.Id == access.CallerId,
                    cancellationToken)
            : null;
        if (confirmer is null || !HasCorrectCurrentPassword(confirmer, patchRequest.SenhaAtual))
        {
            return UserProfileUpdateResult.Invalid(
                "senhaAtual",
                "current_password_invalid",
                "Confirme a senha atual para alterar o e-mail.");
        }

        if (_throttleKeyFactory is null || _throttleKeyFactory.IsSynthetic ||
            _emailAddressReservations is null || _auditoriaService is null)
            return UserProfileUpdateResult.Unavailable();

        await _emailAddressReservations.LockAddressAsync(patchRequest.Email!, cancellationToken);
        return await _emailAddressReservations.IsUnavailableToAsync(
            patchRequest.Email!, user.Id, cancellationToken)
            ? UserProfileUpdateResult.Conflict()
            : null;
    }

    private async Task PersistPatchAsync(
        Usuario user,
        UsuarioDTOPatchRequest patchRequest,
        string previousEmail,
        bool emailChanged,
        int callerId,
        IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        if (emailChanged)
        {
            await _emailAddressReservations!.ReleaseReservationForOwnerAsync(
                patchRequest.Email!, user.Id, cancellationToken);
        }

        _mapper.Map(patchRequest, user);
        if (!emailChanged)
            return;

        user.TokenRedefinicaoHash = null;
        user.TokenExpiracao = null;

        var now = _emailAddressReservations!.GetUtcNow();
        var operationId = Guid.NewGuid();
        await _emailAddressReservations.ReserveFormerAddressAsync(
            previousEmail, user.Id, now, cancellationToken);
        _emailAddressReservations.AddNoticeJobs(
            operationId, user.Id, previousEmail, patchRequest.Email!, now);
        await _auditoriaService!.RegistrarEventoObrigatorioAsync(new CreateLogAuditoriaDTO
        {
            CodigoEvento = CodigoEventoAuditoria.TrocaEmail,
            OrigemConfiavel = OrigemConfiavelAuditoria.UsuarioAutenticado,
            Resultado = ResultadoOperacaoAuditoria.Sucesso,
            UsuarioId = callerId,
            ReferenciaRecurso = $"usuario:{user.Id}",
            CorrelationId = operationId.ToString("N")
        });

        await CancelRecoveryJobsAsync(user.Id, previousEmail, transaction, cancellationToken);
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
            if (!string.IsNullOrEmpty(operation.from) ||
                path is null)
            {
                return InvalidPatch();
            }

            var allowedPath = operation.OperationType switch
            {
                OperationType.Replace => ReplaceablePaths.Contains(path),
                OperationType.Test => PersistentPaths.Contains(path),
                _ => false
            };
            if (!allowedPath)
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

    private static bool IsEmailRelatedUniqueViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
            ConstraintName: "IX_Usuarios_Email" or
                "PK_EmailAddressReservations" or
                "UX_EmailChangeNoticeJobs_Operation_Recipient"
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
