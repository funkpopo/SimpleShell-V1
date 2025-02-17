using Microsoft.Web.WebView2.Core;

namespace SshNetWebTerminal.Forms;

public partial class MainForm : Form
{
    private readonly Microsoft.Web.WebView2.WinForms.WebView2 webView;
    private readonly string baseUrl;
    
    public MainForm(string url)
    {
        CheckForIllegalCrossThreadCalls = false;
        InitializeComponent();
        baseUrl = url;
        
        // 创建WebView2控件
        webView = new Microsoft.Web.WebView2.WinForms.WebView2
        {
            Dock = DockStyle.Fill
        };
        
        Controls.Add(webView);
        Load += MainForm_Load;
    }

    private async void MainForm_Load(object? sender, EventArgs e)
    {
        try 
        {
            await InitializeWebView();
        }
        catch(Exception ex)
        {
            var errorMessage = $"WebView2初始化失败:\n" +
                             $"错误类型: {ex.GetType().Name}\n" +
                             $"错误消息: {ex.Message}\n" +
                             $"堆栈跟踪: {ex.StackTrace}";
            
            MessageBox.Show(errorMessage, "错误", 
                MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    private async Task InitializeWebView()
    {
        try
        {
            var userDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "SshNetWebTerminal",
                "WebView2Data"
            );
            
            // 确保目录存在
            Directory.CreateDirectory(userDataFolder);

            // 创建WebView2环境选项
            var options = new CoreWebView2EnvironmentOptions
            {
                AllowSingleSignOnUsingOSPrimaryAccount = true,
                ExclusiveUserDataFolderAccess = false
            };

            // 创建WebView2环境
            var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder, options);
            
            // 初始化WebView2
            await webView.EnsureCoreWebView2Async(env);
            
            // 配置WebView2
            webView.CoreWebView2.Settings.IsScriptEnabled = true;
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
            webView.CoreWebView2.Settings.IsWebMessageEnabled = true;
            webView.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = true;
            
            // 添加导航错误处理
            webView.CoreWebView2.NavigationCompleted += (s, e) =>
            {
                if (!e.IsSuccess)
                {
                    MessageBox.Show($"导航失败: {e.WebErrorStatus}\nURL: {baseUrl}", 
                        "导航错误", 
                        MessageBoxButtons.OK, 
                        MessageBoxIcon.Warning);
                }
            };
            
            // 导航到目标URL
            webView.CoreWebView2.Navigate(baseUrl);
        }
        catch (Exception ex)
        {
            throw new Exception($"WebView2初始化过程中发生错误: {ex.Message}", ex);
        }
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        try
        {
            base.OnFormClosing(e);
            if (webView != null)
            {
                webView.Dispose();
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"关闭窗口时发生错误: {ex.Message}", "错误",
                MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
} 