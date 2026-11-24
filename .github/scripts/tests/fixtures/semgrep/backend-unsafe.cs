using System.Net.Http;

public static class UnsafeExample
{
    public static HttpClientHandler Create() => new HttpClientHandler
    {
        ServerCertificateCustomValidationCallback =
            HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
    };

    public static HttpClientHandler CreateOther()
    {
        var handler = new HttpClientHandler();
        handler.ServerCertificateCustomValidationCallback = (request, certificate, chain, errors) => true;
        return handler;
    }
}
