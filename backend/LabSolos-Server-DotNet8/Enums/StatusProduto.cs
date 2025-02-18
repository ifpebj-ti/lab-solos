namespace LabSolos_Server_DotNet8.Enums
{
    public enum StatusProduto
    {
        Disponivel, //Pode ser solicitado
        EmUso, //Está indisponível, no momento
        Danificado, //Inapropriado para uso
        Emprestado, //Está com alguém em outra instituição
        Esgotado, //Acabou
        Vencido, //Deve ser descartado, em tese
        Perdido, //Não se sabe o paradeiro
        Solicitado, // Alguém deseja usar
        Indefinido
    }
}