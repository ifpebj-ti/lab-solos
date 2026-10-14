using System.Net;
using LabSolos_Server_DotNet8.Extensions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Tests.Integration;

public sealed class TrustedProxyTests
{
    private const string TrustedProxyAddress = "10.20.0.5";

    [Fact]
    public void ForwardedHeaderOptionsTrustOnlyConfiguredExactProxyAndOneHop()
    {
        var options = Program.BuildForwardedHeadersOptions(CreateConfiguration(TrustedProxyAddress));

        Assert.Equal(ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto, options.ForwardedHeaders);
        Assert.Equal(1, options.ForwardLimit);
        Assert.Equal([IPAddress.Parse(TrustedProxyAddress)], options.KnownProxies);
        Assert.Empty(options.KnownNetworks);
    }

    [Fact]
    public async Task KnownProxyMayForwardOneClientAddressAndProtocol()
    {
        var context = CreateContext(TrustedProxyAddress, "198.51.100.20, 198.51.100.21");
        context.Request.Headers["X-Forwarded-Proto"] = "https";

        await InvokeForwardedHeadersAsync(context, CreateConfiguration(TrustedProxyAddress));

        Assert.Equal(IPAddress.Parse("198.51.100.21"), context.Connection.RemoteIpAddress);
        Assert.Equal("https", context.Request.Scheme);
        Assert.Equal("198.51.100.21", context.GetClientIpAddress());
    }

    [Fact]
    public async Task UntrustedRemoteCannotForgeResolvedClientAddressWithForwardingHeaders()
    {
        var context = CreateContext("198.51.100.40", "203.0.113.99");
        context.Request.Scheme = "http";
        context.Request.Headers["X-Forwarded-Proto"] = "https";
        context.Request.Headers["X-Real-IP"] = "203.0.113.98";
        context.Request.Headers["CF-Connecting-IP"] = "203.0.113.97";
        var configuration = CreateConfiguration(TrustedProxyAddress);

        await InvokeForwardedHeadersAsync(context, configuration);

        Assert.Equal(IPAddress.Parse("198.51.100.40"), context.Connection.RemoteIpAddress);
        Assert.Equal("http", context.Request.Scheme);
        Assert.Equal("198.51.100.40", context.GetClientIpAddress());
    }

    [Theory]
    [InlineData("0.0.0.0")]
    [InlineData("10.20.0.0/24")]
    [InlineData(" invalid ")]
    public void ForwardedHeaderOptionsRejectNonExactProxyAddress(string configuredProxy)
    {
        var configuration = CreateConfiguration(configuredProxy);

        Assert.Throws<InvalidOperationException>(() => Program.BuildForwardedHeadersOptions(configuration));
    }

    private static IConfiguration CreateConfiguration(string proxyAddress) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AuthenticationProtection:ForwardedHeaders:KnownProxies:0"] = proxyAddress
            })
            .Build();

    private static DefaultHttpContext CreateContext(string remoteAddress, string forwardedFor)
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse(remoteAddress);
        context.Request.Headers["X-Forwarded-For"] = forwardedFor;
        return context;
    }

    private static async Task InvokeForwardedHeadersAsync(HttpContext context, IConfiguration configuration)
    {
        await using var services = new ServiceCollection()
            .AddLogging()
            .BuildServiceProvider();
        var app = new ApplicationBuilder(services);
        app.UseForwardedHeaders(Program.BuildForwardedHeadersOptions(configuration));
        app.Run(_ => Task.CompletedTask);
        await app.Build()(context);
    }
}
