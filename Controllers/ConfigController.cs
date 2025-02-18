using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace SshNetWebTerminal.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ConfigController : ControllerBase
    {
        private readonly string _configPath;

        public ConfigController(IWebHostEnvironment env)
        {
            _configPath = Path.Combine(AppContext.BaseDirectory, "config.json");
        }

        [HttpGet]
        public IActionResult GetConfig()
        {
            if (!System.IO.File.Exists(_configPath))
            {
                return Ok(new { folders = new List<object>(), connections = new List<object>() });
            }

            var config = System.IO.File.ReadAllText(_configPath);
            return Ok(JsonSerializer.Deserialize<object>(config));
        }

        [HttpPost]
        public IActionResult SaveConfig([FromBody] object config)
        {
            var json = JsonSerializer.Serialize(config, new JsonSerializerOptions
            {
                WriteIndented = true
            });
            System.IO.File.WriteAllText(_configPath, json);
            return Ok();
        }
    }
} 