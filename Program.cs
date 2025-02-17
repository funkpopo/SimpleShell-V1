using Microsoft.Extensions.DependencyInjection.Extensions;
using SshNetWebTerminal.Forms;
using SshNetWebTerminal.Hubs;
using SshNetWebTerminal.Services;
using System.Threading;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();
builder.Services.AddSignalR();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

// 在开发环境中禁用HTTPS重定向
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseStaticFiles();
app.UseRouting();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

// Add Hub
app.MapHub<SshHub>("/ssh");

// 创建一个取消令牌源
var cts = new CancellationTokenSource();

// 在新线程中启动Web服务器
var serverThread = new Thread(() =>
{
    try
    {
        app.RunAsync(cts.Token).GetAwaiter().GetResult();
    }
    catch (OperationCanceledException)
    {
        // 正常退出
    }
});
serverThread.IsBackground = true;
serverThread.Start();

// 等待服务器启动
Thread.Sleep(1000); // 给服务器一些启动时间

// 创建并运行Windows窗体应用程序
var uiThread = new Thread(() =>
{
    Application.SetHighDpiMode(HighDpiMode.SystemAware);
    Application.EnableVisualStyles();
    Application.SetCompatibleTextRenderingDefault(false);

    // 使用HTTP URL而不是HTTPS
    var mainForm = new MainForm("http://localhost:5257");
    mainForm.FormClosed += (s, e) =>
    {
        cts.Cancel();
    };

    Application.Run(mainForm);
});

// 设置STA线程模式
uiThread.SetApartmentState(ApartmentState.STA);
uiThread.Start();
uiThread.Join(); // 等待UI线程结束
