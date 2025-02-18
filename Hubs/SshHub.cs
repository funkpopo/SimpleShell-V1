using Microsoft.AspNetCore.SignalR;
using Renci.SshNet;
using Renci.SshNet.Common;
using DotnetTerminal.Services;
using System.Net.Sockets;
using System.Net.WebSockets;
using System.Text;
using static System.Runtime.InteropServices.JavaScript.JSType;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http;
using System.Text.Json;
using DotnetTerminal.Models;
using DotnetTerminal.Extensions;

namespace DotnetTerminal.Hubs;
public class SshHub : Hub
{
    private readonly IConfiguration _config;
    private readonly ILogger<SshHub> _logger;

    public SshHub(IConfiguration config, ILogger<SshHub> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task InitializeConnection(string configId)
    {
        try
        {
            _logger.LogInformation("正在初始化连接: {ConfigId}", configId);
            
            // 从配置中获取连接信息
            var config = await GetConnectionConfig(configId);
            if (config == null)
            {
                throw new Exception("无效的连接配置");
            }

            _logger.LogInformation("正在连接到 {Host}:{Port}", config.Host, config.Port);

            // 创建SSH客户端
            var client = new SshClient(config.Host, config.Username, config.Password);
            
            // 设置连接超时
            client.ConnectionInfo.Timeout = TimeSpan.FromSeconds(30);
            
            // 连接到服务器
            await Task.Run(() => {
                try {
                    client.Connect();
                }
                catch (Exception ex) {
                    _logger.LogError(ex, "SSH连接失败");
                    throw new Exception($"SSH连接失败: {ex.Message}");
                }
            });

            if (!client.IsConnected)
            {
                throw new Exception("SSH连接失败");
            }

            _logger.LogInformation("SSH连接成功，正在创建终端...");

            // 创建终端流
            var shellStream = client.CreateShellStream("xterm-256color", 80, 24, 800, 600, 1024);

            // 注册会话
            var wrapper = new SshStreamEventWrapper(Clients.Caller, shellStream);
            SshSessionManager.Register(Context.ConnectionId, client, shellStream, wrapper);

            await Clients.Caller.SendAsync("ConnectionEstablished");
            _logger.LogInformation("终端连接成功建立");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "建立连接时发生错误");
            await Clients.Caller.SendAsync("ConnectionError", ex.Message);
            throw;
        }
    }

    public async Task Disconnect()
    {
        try
        {
            await SshSessionManager.Remove(Context.ConnectionId);
            await Clients.Caller.SendAsync("Disconnect");
        }
        catch {}
    }

    // Receive data from the browser.
    public async Task SendMessage(string data)
    {
        try
        {
            ShellStream shellStream = SshSessionManager.GetShellStream(Context.ConnectionId) ?? throw new Exception("INvalid Shell");

            byte[] encoded = Encoding.UTF8.GetBytes(data);
            await shellStream.WriteAsync(encoded);
            await shellStream.FlushAsync();

        }
        catch (Exception e)
        {
            await Clients.Caller.SendAsync("Error", e.Message);
            throw new HubException(e.Message);
        }
    }

    // When the hub is removed, do some cleanup checks.
    protected async override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        try
        {
            List<string> Ids = await SshSessionManager.Cleanup();

            foreach (string id in Ids)
            {
                await Clients.Client(id).SendAsync("Disconnect");
            }
        }
        catch (Exception)
        {
            throw;
        }
    }

    private async Task<ConnectionConfig?> GetConnectionConfig(string configId)
    {
        try
        {
            // 通过 HTTP 客户端获取配置
            using var client = new HttpClient();
            var response = await client.GetAsync($"http://localhost:5257/api/config/{configId}");
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("获取配置失败: {StatusCode}", response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<ConnectionConfig>(content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取连接配置时发生错误");
            return null;
        }
    }

    public async Task ResizeTerminal(int cols, int rows)
    {
        try
        {
            var stream = SshSessionManager.GetShellStream(Context.ConnectionId);
            if (stream != null)
            {
                await Task.Run(() => stream.WindowChanged(cols, rows));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "调整终端大小失败");
        }
    }
}
