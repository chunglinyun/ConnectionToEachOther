namespace ConnectionToEachOther.Models;

public class SignalMessage
{
    public string Type { get; set; } = string.Empty; // "offer" | "answer" | "ice-candidate"
    public string Payload { get; set; } = string.Empty;
}

public class TransferRequest
{
    public string FromId { get; set; } = string.Empty;
    public string FromName { get; set; } = string.Empty;
    public List<FileInfo> Files { get; set; } = new();
}

public class FileInfo
{
    public string Name { get; set; } = string.Empty;
    public long Size { get; set; }
    public string Type { get; set; } = string.Empty;
}
