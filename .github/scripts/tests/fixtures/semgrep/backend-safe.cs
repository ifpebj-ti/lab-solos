using System.Net.Http;

public static class SafeExample
{
    public static HttpClientHandler Create() => new HttpClientHandler();
}
