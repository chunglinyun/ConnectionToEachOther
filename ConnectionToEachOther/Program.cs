using ConnectionToEachOther.Hubs;
using ConnectionToEachOther.Services;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();
builder.Services.AddSignalR(options =>
{
    options.MaximumReceiveMessageSize = null; // No size limit
});
builder.Services.AddSingleton<ClientRegistryService>();

var app = builder.Build();

// Trust X-Forwarded-For from the local SPA dev proxy
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
    KnownProxies = { System.Net.IPAddress.Loopback, System.Net.IPAddress.IPv6Loopback }
});

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

app.MapHub<TransferHub>("/hubs/transfer");
app.MapControllers();
app.MapControllerRoute(
    name: "default",
    pattern: "{controller}/{action=Index}/{id?}");

app.MapFallbackToFile("index.html");

app.Run();