using System.Net;
using System.Net.Mail;
using System.Runtime.CompilerServices;

namespace LabSolos_Server_DotNet8.Services
{
    public interface IEmailService
    {
        void EnviarEmail(string para, string assunto, string corpo);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly Func<SmtpClient> _smtpClientFactory;
        private readonly Action<SmtpClient, MailMessage> _sendMail;

        public EmailService(
            IConfiguration config,
            Func<SmtpClient>? smtpClientFactory = null,
            Action<SmtpClient, MailMessage>? sendMail = null)
        {
            _config = config;
            _smtpClientFactory = smtpClientFactory ?? CriarSmtpClient;
            _sendMail = sendMail ?? ((smtp, message) => smtp.Send(message));
        }

        public void EnviarEmail(string para, string assunto, string corpo)
        {
            var smtpHost = _config["Email:SmtpHost"] ?? throw new InvalidOperationException("SMTP Host não configurado.");
            var smtpPort = int.TryParse(_config["Email:SmtpPort"], out var port) ? port : throw new InvalidOperationException("Porta SMTP inválida ou não configurada.");
            var smtpUser = _config["Email:Usuario"] ?? throw new InvalidOperationException("Usuário SMTP não configurado.");
            var smtpPass = _config["Email:Senha"] ?? throw new InvalidOperationException("Senha SMTP não configurada.");
            var de = _config["Email:De"] ?? throw new InvalidOperationException("Endereço de envio não configurado.");

            var fromAddress = new MailAddress(de, "Redefinição de Senha LabOn");
            var toAddress = new MailAddress(para);

            using var smtp = _smtpClientFactory();
            smtp.Host = smtpHost;
            smtp.Port = smtpPort;
            smtp.EnableSsl = true;
            smtp.DeliveryMethod = SmtpDeliveryMethod.Network;
            smtp.UseDefaultCredentials = false;
            smtp.Credentials = new NetworkCredential(smtpUser, smtpPass);

            using (var message = new MailMessage(fromAddress, toAddress)
            {
                Subject = assunto,
                Body = corpo,
                IsBodyHtml = true // <- ESSENCIAL!
            })
            {
                _sendMail(smtp, message);
            }
        }

        private static SmtpClient CriarSmtpClient() => new();
    }
}
