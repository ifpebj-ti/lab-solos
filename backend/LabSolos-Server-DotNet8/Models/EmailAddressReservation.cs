namespace LabSolos_Server_DotNet8.Models;

/// <summary>Temporary claim on a former, normalized email address.</summary>
public sealed class EmailAddressReservation
{
    public required byte[] NormalizedAddressHash { get; set; }

    public int? OwnerUserId { get; set; }

    public Usuario? Owner { get; set; }

    public DateTimeOffset ReservedAt { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }
}
