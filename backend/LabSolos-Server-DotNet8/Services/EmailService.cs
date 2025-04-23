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

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public void EnviarEmail(string para, string assunto, string corpo)
        {
            var smtpHost = _config["Email:SmtpHost"] ?? throw new InvalidOperationException("SMTP Host não configurado.");
            var smtpPort = int.TryParse(_config["Email:SmtpPort"], out var port) ? port : throw new InvalidOperationException("Porta SMTP inválida ou não configurada.");
            var smtpUser = _config["Email:Usuario"] ?? throw new InvalidOperationException("Usuário SMTP não configurado.");
            var smtpPass = _config["Email:Senha"] ?? throw new InvalidOperationException("Senha SMTP não configurada.");
            var de = _config["Email:De"] ?? throw new InvalidOperationException("Endereço de envio não configurado.");

            var fromAddress = new MailAddress(de, "Sistema Teste");
            var toAddress = new MailAddress(para);

            var smtp = new SmtpClient
            {
                Host = smtpHost,
                Port = smtpPort,
                EnableSsl = true,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(smtpUser, smtpPass)
            };

            using (var message = new MailMessage(fromAddress, toAddress)
            {
                Subject = assunto,
                Body = corpo,
                IsBodyHtml = true // <- ESSENCIAL!
            })
            {
                smtp.Send(message);
            }
        }
    }
}