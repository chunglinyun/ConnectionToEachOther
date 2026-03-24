using System.Collections.Concurrent;
using System.Net;
using ConnectionToEachOther.Models;

namespace ConnectionToEachOther.Services;

public class ClientRegistryService
{
    private readonly ConcurrentDictionary<string, ClientInfo> _clients = new();

    public void Register(string connectionId, string displayName, string ipAddress)
    {
        var subnet = GetSubnet(ipAddress);
        _clients[connectionId] = new ClientInfo
        {
            ConnectionId = connectionId,
            DisplayName = displayName,
            IpAddress = ipAddress,
            Subnet = subnet,
            JoinedAt = DateTime.UtcNow
        };
    }

    public void Unregister(string connectionId)
    {
        _clients.TryRemove(connectionId, out _);
    }

    public IEnumerable<ClientInfo> GetClientsOnSameSubnet(string connectionId)
    {
        if (!_clients.TryGetValue(connectionId, out var self))
            return Enumerable.Empty<ClientInfo>();

        return _clients.Values
            .Where(c => c.Subnet == self.Subnet && c.ConnectionId != connectionId);
    }

    public IEnumerable<string> GetConnectionIdsOnSameSubnet(string connectionId)
    {
        return GetClientsOnSameSubnet(connectionId).Select(c => c.ConnectionId);
    }

    public ClientInfo? Get(string connectionId)
    {
        _clients.TryGetValue(connectionId, out var client);
        return client;
    }

    private static string GetSubnet(string ipAddress)
    {
        if (string.IsNullOrEmpty(ipAddress)) return "unknown";
        try
        {
            var parts = ipAddress.Split('.');
            if (parts.Length == 4)
                return $"{parts[0]}.{parts[1]}.{parts[2]}";
        }
        catch { }
        return ipAddress;
    }
}
