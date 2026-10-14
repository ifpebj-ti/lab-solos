using System.Net;
using System.Net.Mail;

namespace LabSolos_Server_DotNet8.Services;

public interface IEmailService
{
    void EnviarEmail(string para, string assunto, string corpo);

    Task EnviarEmailAsync(
        string para,
        string assunto,
        string corpo,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        EnviarEmail(para, assunto, corpo);
        return Task.CompletedTask;
    }
}

public sealed class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly Func<SmtpClient> _smtpClientFactory;
    private readonly Action<SmtpClient, MailMessage> _sendMail;
    private readonly Func<SmtpClient, MailMessage, CancellationToken, Task> _sendMailAsync;

    public EmailService(
        IConfiguration config,
        Func<SmtpClient>? smtpClientFactory = null,
        Action<SmtpClient, MailMessage>? sendMail = null,
        Func<SmtpClient, MailMessage, CancellationToken, Task>? sendMailAsync = null)
    {
        _config = config ?? throw new ArgumentNullException(nameof(config));
        _smtpClientFactory = smtpClientFactory ?? CreateSmtpClient;
        _sendMail = sendMail ?? ((smtp, message) => smtp.Send(message));
        _sendMailAsync = sendMailAsync ?? (sendMail is null
            ? SendMailAsync
            : SendMailSynchronouslyForTestAsync);
    }

    public void EnviarEmail(string para, string assunto, string corpo)
    {
        var (smtp, message) = CreateMessage(para, assunto, corpo);
        using (smtp)
        using (message)
        {
            _sendMail(smtp, message);
        }
    }

    public async Task EnviarEmailAsync(
        string para,
        string assunto,
        string corpo,
        CancellationToken cancellationToken = default)
    {
        var (smtp, message) = CreateMessage(para, assunto, corpo);
        using (smtp)
        using (message)
        {
            await _sendMailAsync(smtp, message, cancellationToken).ConfigureAwait(false);
        }
    }

    private (SmtpClient Smtp, MailMessage Message) CreateMessage(
        string para,
        string assunto,
        string corpo)
    {
        var smtpHost = _config["Email:SmtpHost"]
            ?? throw new InvalidOperationException("SMTP host is not configured.");
        var smtpPort = int.TryParse(_config["Email:SmtpPort"], out var port)
            ? port
            : throw new InvalidOperationException("SMTP port is invalid or not configured.");
        var smtpUser = _config["Email:Usuario"]
            ?? throw new InvalidOperationException("SMTP user is not configured.");
        var smtpPass = _config["Email:Senha"]
            ?? throw new InvalidOperationException("SMTP password is not configured.");
        var fromAddress = _config["Email:De"]
            ?? throw new InvalidOperationException("Sender address is not configured.");

        var sender = new MailAddress(fromAddress, "LabOn password recovery");
        var recipient = new MailAddress(para);
        var smtp = _smtpClientFactory();
        smtp.Host = smtpHost;
        smtp.Port = smtpPort;
        smtp.EnableSsl = true;
        smtp.DeliveryMethod = SmtpDeliveryMethod.Network;
        smtp.UseDefaultCredentials = false;
        smtp.Credentials = new NetworkCredential(smtpUser, smtpPass);

        var message = new MailMessage(sender, recipient)
        {
            Subject = assunto,
            Body = corpo,
            IsBodyHtml = true
        };
        return (smtp, message);
    }

    private static Task SendMailAsync(
        SmtpClient smtp,
        MailMessage message,
        CancellationToken cancellationToken) => smtp.SendMailAsync(message, cancellationToken);

    private Task SendMailSynchronouslyForTestAsync(
        SmtpClient smtp,
        MailMessage message,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _sendMail(smtp, message);
        return Task.CompletedTask;
    }

    private static SmtpClient CreateSmtpClient() => new();
}
