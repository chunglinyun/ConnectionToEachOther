using Microsoft.AspNetCore.SignalR;
using ConnectionToEachOther.Models;
using ConnectionToEachOther.Services;

namespace ConnectionToEachOther.Hubs;

public class TransferHub : Hub
{
    private readonly ClientRegistryService _registry;

    public TransferHub(ClientRegistryService registry)
    {
        _registry = registry;
    }

    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var connectionId = Context.ConnectionId;
        var client = _registry.Get(connectionId);
        _registry.Unregister(connectionId);

        // Notify remaining clients on same subnet
        if (client != null)
        {
            var peers = _registry.GetConnectionIdsOnSameSubnet(connectionId).ToList();
            if (peers.Any())
            {
                var updatedList = _registry.GetClientsOnSameSubnet(connectionId)
                    .Select(c => new { c.ConnectionId, c.DisplayName });
                await Clients.Clients(peers).SendAsync("ClientListUpdated", updatedList);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task RegisterClient(string displayName)
    {
        var remoteIp = Context.GetHttpContext()?.Connection.RemoteIpAddress;
        var ip = remoteIp == null ? "127.0.0.1"
            : remoteIp.IsIPv4MappedToIPv6 ? remoteIp.MapToIPv4().ToString()
            : remoteIp.ToString();
        Console.WriteLine($"ip:{ip}");
        _registry.Register(Context.ConnectionId, displayName, ip);

        // Broadcast updated list to all clients on same subnet (including self)
        await BroadcastClientList();
    }

    public async Task GetLanClients()
    {
        var clients = _registry.GetClientsOnSameSubnet(Context.ConnectionId)
            .Select(c => new { c.ConnectionId, c.DisplayName });
        await Clients.Caller.SendAsync("ClientListUpdated", clients);
    }

    // WebRTC signaling relay
    public async Task SendSignal(string targetConnectionId, Models.SignalMessage signal)
    {
        var from = _registry.Get(Context.ConnectionId);
        if (from == null) return;

        await Clients.Client(targetConnectionId).SendAsync("ReceiveSignal", Context.ConnectionId, signal);
    }

    // Notify target of incoming transfer
    public async Task RequestTransfer(string targetConnectionId, List<Models.FileInfo> files)
    {
        var from = _registry.Get(Context.ConnectionId);
        if (from == null) return;

        await Clients.Client(targetConnectionId).SendAsync("TransferRequest", new Models.TransferRequest
        {
            FromId = Context.ConnectionId,
            FromName = from.DisplayName,
            Files = files
        });
    }

    public async Task RespondTransfer(string targetConnectionId, bool accepted)
    {
        await Clients.Client(targetConnectionId).SendAsync("TransferResponse", Context.ConnectionId, accepted);
    }

    private async Task BroadcastClientList()
    {
        var selfId = Context.ConnectionId;
        var allOnSubnet = _registry.GetClientsOnSameSubnet(selfId).ToList();
        var self = _registry.Get(selfId);

        // Build list visible to each client (excludes themselves)
        var peerIds = allOnSubnet.Select(c => c.ConnectionId).Concat(new[] { selfId }).ToList();

        foreach (var id in peerIds)
        {
            var visibleClients = peerIds
                .Where(pid => pid != id)
                .Select(pid => _registry.Get(pid))
                .Where(c => c != null)
                .Select(c => new { c!.ConnectionId, c.DisplayName });

            await Clients.Client(id).SendAsync("ClientListUpdated", visibleClients);
        }
    }
}