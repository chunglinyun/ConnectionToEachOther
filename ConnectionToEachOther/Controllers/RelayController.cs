using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;

namespace ConnectionToEachOther.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RelayController : ControllerBase
{
    // In-memory relay store: sessionId -> chunkIndex -> data
    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<int, byte[]>> _chunks = new();
    private static readonly ConcurrentDictionary<string, TaskCompletionSource<bool>> _completions = new();

    [HttpPost("upload/{sessionId}/{chunkIndex:int}")]
    [RequestSizeLimit(long.MaxValue)]
    [RequestFormLimits(MultipartBodyLengthLimit = long.MaxValue)]
    public async Task<IActionResult> Upload(string sessionId, int chunkIndex)
    {
        using var ms = new MemoryStream();
        await Request.Body.CopyToAsync(ms);
        var data = ms.ToArray();

        var session = _chunks.GetOrAdd(sessionId, _ => new ConcurrentDictionary<int, byte[]>());
        session[chunkIndex] = data;

        return Ok();
    }

    [HttpGet("download/{sessionId}/{chunkIndex:int}")]
    public async Task<IActionResult> Download(string sessionId, int chunkIndex)
    {
        // Poll until chunk is available (max 30s)
        var deadline = DateTime.UtcNow.AddSeconds(30);
        while (DateTime.UtcNow < deadline)
        {
            if (_chunks.TryGetValue(sessionId, out var session) &&
                session.TryGetValue(chunkIndex, out var data))
            {
                return File(data, "application/octet-stream");
            }
            await Task.Delay(200);
        }
        return NotFound();
    }

    [HttpPost("complete/{sessionId}")]
    public IActionResult Complete(string sessionId)
    {
        _chunks.TryRemove(sessionId, out _);
        return Ok();
    }
}
