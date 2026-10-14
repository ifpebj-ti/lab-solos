namespace LabSolos_Server_DotNet8.Models;

public enum PasswordRecoveryJobStatus
{
    Pending,
    Processing,
    Completed,
    Cancelled,
    Failed
}

public sealed class PasswordRecoveryJob
{
    public Guid Id { get; set; }

    public required byte[] DeliveryKeyHash { get; set; }

    public required byte[] RecipientKeyHash { get; set; }

    public required byte[] PayloadCiphertext { get; set; }

    public required byte[] PayloadNonce { get; set; }

    public required byte[] PayloadTag { get; set; }

    public required string EncryptionKeyId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset NextAttemptAt { get; set; }

    public PasswordRecoveryJobStatus Status { get; set; }

    public int Attempts { get; set; }

    public Guid? LeaseId { get; set; }

    public DateTimeOffset? LeaseUntil { get; set; }

    public int? UserId { get; set; }

    public long? SessionVersion { get; set; }

    public Usuario? User { get; set; }
}
