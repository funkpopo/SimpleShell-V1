using System.Text.Json.Serialization;

namespace SshNetWebTerminal.Models;

// 添加全局设置类
public class GlobalSettings
{
    [JsonPropertyName("language")]
    public string Language { get; set; } = "简体中文";
}

// 修改配置根类
public class ConfigRoot
{
    [JsonPropertyName("settings")]
    public GlobalSettings Settings { get; set; } = new();

    [JsonPropertyName("connections")]
    public List<ConnectionConfig> Connections { get; set; } = new();
}

public class ConnectionConfig
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = "folder"; // folder 或 connection

    [JsonPropertyName("host")]
    public string? Host { get; set; }

    [JsonPropertyName("port")]
    public int? Port { get; set; }

    [JsonPropertyName("username")]
    public string? Username { get; set; }

    [JsonPropertyName("password")]
    public string? Password { get; set; }

    [JsonPropertyName("children")]
    public List<ConnectionConfig> Children { get; set; } = new();
} 