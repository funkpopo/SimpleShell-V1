using System.Text.Json.Serialization;
using System.Drawing;

namespace DotnetTerminal.Models;

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
    public string Type { get; set; } = "connection";

    [JsonPropertyName("host")]
    public string Host { get; set; } = string.Empty;

    [JsonPropertyName("port")]
    public int Port { get; set; } = 22;

    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;

    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;

    [JsonPropertyName("children")]
    public List<ConnectionConfig> Children { get; set; } = new();

    public Color Color { get; set; }
    
    public ConnectionConfig()
    {
        // 在创建新连接配置时生成随机颜色
        var random = new Random();
        double hue = random.NextDouble();
        Color = ColorFromHSL(hue, 0.7, 0.5);
    }
    
    private Color ColorFromHSL(double hue, double saturation, double lightness)
    {
        double r = 0, g = 0, b = 0;
        if (saturation == 0)
        {
            r = g = b = lightness;
        }
        else
        {
            double q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
            double p = 2 * lightness - q;

            r = HueToRGB(p, q, hue + 1.0/3.0);
            g = HueToRGB(p, q, hue);
            b = HueToRGB(p, q, hue - 1.0/3.0);
        }
        
        return Color.FromArgb(255, (int)(r * 255), (int)(g * 255), (int)(b * 255));
    }

    private double HueToRGB(double p, double q, double t)
    {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1.0/6.0) return p + (q - p) * 6 * t;
        if (t < 1.0/2.0) return q;
        if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6;
        return p;
    }
} 