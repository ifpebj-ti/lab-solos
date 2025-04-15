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
            var smtpHost = _config["Email:SmtpHost"];
            var smtpPort = int.Parse(_config["Email:SmtpPort"]);
            var smtpUser = _config["Email:Usuario"];
            var smtpPass = _config["Email:Senha"];
            var de = _config["Email:De"];

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