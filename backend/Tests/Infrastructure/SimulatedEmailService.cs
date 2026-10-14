using LabSolos_Server_DotNet8.Services;

namespace Tests.Infrastructure;

public sealed class SimulatedEmailService : IEmailService
{
    private int _sentCount;

    public int SentCount => Volatile.Read(ref _sentCount);

    public void EnviarEmail(string para, string assunto, string corpo)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(para);
        ArgumentException.ThrowIfNullOrWhiteSpace(assunto);
        ArgumentException.ThrowIfNullOrWhiteSpace(corpo);
        Interlocked.Increment(ref _sentCount);
    }
}
