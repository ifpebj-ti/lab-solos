using System.Net;
using LabSolos_Server_DotNet8.Extensions;
using Microsoft.AspNetCore.Http;

namespace Tests.Extensions;

public sealed class HttpContextExtensionsTests
{
    [Fact]
    public void GetClientIpAddressRetornaPrimeiroHeaderValidoNaOrdemConfigurada()
    {
        var context = CreateContext("198.51.100.40");
        context.Request.Headers["X-Forwarded-For"] = " 198.51.100.10, 198.51.100.11 ";
        context.Request.Headers["X-Real-IP"] = "198.51.100.20";

        var result = context.GetClientIpAddress();

        Assert.Equal("198.51.100.10", result);
    }

    [Fact]
    public void GetClientIpAddressIgnoraHeaderAusenteVazioEUnknownAteEncontrarProximoValido()
    {
        var context = CreateContext("198.51.100.40");
        context.Request.Headers["X-Real-IP"] = string.Empty;
        context.Request.Headers["CF-Connecting-IP"] = "unknown";
        context.Request.Headers["True-Client-IP"] = " 198.51.100.30 ";

        var result = context.GetClientIpAddress();

        Assert.Equal("198.51.100.30", result);
    }

    [Fact]
    public void GetClientIpAddressUsaRemoteIpQuandoNenhumHeaderTemValorValido()
    {
        var context = CreateContext("198.51.100.40");
        context.Request.Headers["X-Forwarded-For"] = "unknown";
        context.Request.Headers["X-Real-IP"] = string.Empty;

        var result = context.GetClientIpAddress();

        Assert.Equal("198.51.100.40", result);
    }

    [Fact]
    public void GetClientIpAddressUsaLoopbackQuandoContextoNaoTemRemoteIp()
    {
        var context = new DefaultHttpContext();

        var result = context.GetClientIpAddress();

        Assert.Equal("127.0.0.1", result);
    }

    private static DefaultHttpContext CreateContext(string remoteIpAddress)
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse(remoteIpAddress);
        return context;
    }
}
