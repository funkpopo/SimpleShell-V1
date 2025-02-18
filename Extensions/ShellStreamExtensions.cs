using Renci.SshNet;

namespace DotnetTerminal.Extensions;

public static class ShellStreamExtensions
{
    public static void WindowChanged(this ShellStream stream, int columns, int rows)
    {
        // 发送 SIGWINCH 信号来通知终端大小改变
        var command = $"\x1b[8;{rows};{columns}t";
        var data = System.Text.Encoding.ASCII.GetBytes(command);
        stream.Write(data, 0, data.Length);
        stream.Flush();
    }
} 