using Microsoft.AspNetCore.SignalR;
using Renci.SshNet;
using Renci.SshNet.Common;
using System.Text;

namespace DotnetTerminal.Services;

public class SshStreamEventWrapper : IDisposable
{
    private readonly ISingleClientProxy Socket;
    private readonly ShellStream ShellStream;
    private bool isDisposed;

    public SshStreamEventWrapper(ISingleClientProxy socket, ShellStream shellStream)
    {
        Socket = socket;
        ShellStream = shellStream;

        ShellStream.DataReceived += DataReceived;
        ShellStream.ErrorOccurred += ErrorOccurred;
    }

    private async void DataReceived(object? _, ShellDataEventArgs e) 
    {
        if (!isDisposed)
        {
            await Socket.SendAsync("ReceiveMessage", Encoding.UTF8.GetString(e.Data));
        }
    }

    private async void ErrorOccurred(object? _, ExceptionEventArgs e) 
    {
        if (!isDisposed)
        {
            await Socket.SendAsync("Error", e.Exception.Message);
        }
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!isDisposed)
        {
            if (disposing)
            {
                ShellStream.DataReceived -= DataReceived;
                ShellStream.ErrorOccurred -= ErrorOccurred;
            }
            isDisposed = true;
        }
    }
}