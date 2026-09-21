using System.Net.Mail;
using LabSolos_Server_DotNet8.Services;
using Microsoft.Extensions.Configuration;

namespace Tests.Services;

public sealed class EmailServiceTests
{
    [Fact]
    public void EnviarEmailDisposesSmtpClientAfterSuccessfulSend()
    {
        TrackingSmtpClient? smtpClient = null;
        var sentMessage = string.Empty;
        var service = CreateService(
            () => smtpClient = new TrackingSmtpClient(),
            (_, message) => sentMessage = $"{message.Subject}|{message.Body}");

        service.EnviarEmail("destino@example.com", "Assunto", "Corpo");

        Assert.NotNull(smtpClient);
        Assert.True(smtpClient!.IsDisposed);
        Assert.Equal("Assunto|Corpo", sentMessage);
    }

    [Fact]
    public void EnviarEmailDisposesSmtpClientWhenSendFails()
    {
        TrackingSmtpClient? smtpClient = null;
        var service = CreateService(
            () => smtpClient = new TrackingSmtpClient(),
            (_, _) => throw new SmtpException("Falha SMTP sintética"));

        Assert.Throws<SmtpException>(() => service.EnviarEmail(
            "destino@example.com",
            "Assunto",
            "Corpo"));

        Assert.NotNull(smtpClient);
        Assert.True(smtpClient!.IsDisposed);
    }

    private static EmailService CreateService(
        Func<SmtpClient> smtpClientFactory,
        Action<SmtpClient, MailMessage> sendMail)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Email:SmtpHost"] = "smtp.example.com",
                ["Email:SmtpPort"] = "587",
                ["Email:Usuario"] = "usuario-sintetico",
                ["Email:Senha"] = "senha-sintetica",
                ["Email:De"] = "origem@example.com"
            })
            .Build();

        return new EmailService(configuration, smtpClientFactory, sendMail);
    }

    private sealed class TrackingSmtpClient : SmtpClient
    {
        public bool IsDisposed { get; private set; }

        protected override void Dispose(bool disposing)
        {
            IsDisposed = true;
            base.Dispose(disposing);
        }
    }
}
