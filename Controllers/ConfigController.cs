using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using DotnetTerminal.Models;

namespace DotnetTerminal.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ConfigController : ControllerBase
    {
        private readonly string _configPath;
        private readonly ILogger<ConfigController> _logger;

        public ConfigController(IWebHostEnvironment env, ILogger<ConfigController> logger)
        {
            _configPath = Path.Combine(env.ContentRootPath, "config.json");
            _logger = logger;
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ConnectionConfig>> GetConnection(string id)
        {
            try
            {
                var config = await LoadConfig();
                var connection = FindConnection(config.Connections, id);
                if (connection == null)
                {
                    return NotFound();
                }
                return Ok(connection);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "获取连接配置失败");
                return StatusCode(500, "内部服务器错误");
            }
        }

        private ConnectionConfig? FindConnection(List<ConnectionConfig> connections, string id)
        {
            foreach (var conn in connections)
            {
                if (conn.Id == id) return conn;
                var child = FindConnection(conn.Children, id);
                if (child != null) return child;
            }
            return null;
        }

        private async Task<ConfigRoot> LoadConfig()
        {
            if (!System.IO.File.Exists(_configPath))
            {
                return new ConfigRoot();
            }

            var json = await System.IO.File.ReadAllTextAsync(_configPath);
            return JsonSerializer.Deserialize<ConfigRoot>(json) ?? new ConfigRoot();
        }

        [HttpPost]
        public async Task<IActionResult> SaveConfig([FromBody] ConfigRoot config)
        {
            try 
            {
                var json = JsonSerializer.Serialize(config, new JsonSerializerOptions
                {
                    WriteIndented = true
                });
                await System.IO.File.WriteAllTextAsync(_configPath, json);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "保存配置失败");
                return StatusCode(500, "保存配置失败");
            }
        }
    }
} 