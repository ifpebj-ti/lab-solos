// A bounded HTTP probe for the shell-free application container.
if (args.Length != 1 ||
    !Uri.TryCreate(args[0], UriKind.Absolute, out var endpoint) ||
    endpoint.Scheme != Uri.UriSchemeHttp)
{
    return 2;
}

using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
try
{
    using var response = await client.GetAsync(endpoint);
    return response.IsSuccessStatusCode ? 0 : 1;
}
catch (HttpRequestException)
{
    return 1;
}
catch (TaskCanceledException)
{
    return 1;
}
