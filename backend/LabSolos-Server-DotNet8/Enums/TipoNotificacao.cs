namespace LabSolos_Server_DotNet8.Enums
{
    public enum TipoNotificacao
    {
        EstoqueBaixo,           // Produto com estoque abaixo do mínimo
        ProdutoVencido,         // Produto vencido
        ProdutoProximoVencimento, // Produto próximo ao vencimento
        SolicitacaoCadastro,    // Nova solicitação de cadastro
        SolicitacaoEmprestimo,  // Nova solicitação de empréstimo
        NovoEmprestimo,         // Novo empréstimo criado
        SolicitacaoUsuario,     // Nova solicitação de usuário
        EmprestimoAprovado,     // Empréstimo foi aprovado
        EmprestimoRejeitado,    // Empréstimo foi rejeitado
        CadastroAprovado,       // Cadastro foi aprovado
        CadastroRejeitado,      // Cadastro foi rejeitado
        Sistema,                // Notificação do sistema
        Geral                   // Notificação geral
    }
}
