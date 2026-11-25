namespace LabSolos_Server_DotNet8.Models;

public enum EmailChangeNoticeRecipient
{
    PreviousAddress,
    NewAddress
}

public enum EmailChangeNoticeStatus
{
    Pending,
    Processing,
    Delivered,
    Failed
}

/// <summary>Durable, independently retryable notification for one email-change recipient.</summary>
public sealed class EmailChangeNoticeJob
{
    public Guid Id { get; set; }

    public Guid OperationId { get; set; }

    public int? UserId { get; set; }

    public Usuario? User { get; set; }

    public EmailChangeNoticeRecipient Recipient { get; set; }

    public required byte[] RecipientKeyHash { get; set; }

    public required byte[] PayloadCiphertext { get; set; }

    public required byte[] PayloadNonce { get; set; }

    public required byte[] PayloadTag { get; set; }

    public required string EncryptionKeyId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset DeadlineAt { get; set; }

    public DateTimeOffset RetainUntil { get; set; }

    public DateTimeOffset NextAttemptAt { get; set; }

    public EmailChangeNoticeStatus Status { get; set; }

    public int Attempts { get; set; }

    public Guid? LeaseId { get; set; }

    public DateTimeOffset? LeaseUntil { get; set; }

    public DateTimeOffset? DeliveredAt { get; set; }

    public string? LastFailureCode { get; set; }
}
