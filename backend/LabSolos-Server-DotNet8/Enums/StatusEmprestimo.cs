namespace LabSolos_Server_DotNet8.Enums
{
    public enum StatusEmprestimo
    {
        Pendente, //Foi solicitado
        Aprovado, //Foi aprovado, preciso ir buscar
        EmAndamento, //Foi aprovado, estou usando
        Rejeitado, //Foi rejeitado
    }
}