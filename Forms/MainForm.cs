using Microsoft.Web.WebView2.Core;
using System.Windows.Forms;
using System.Drawing;
using System.Text.Json;
using SshNetWebTerminal.Models;
using System.IO;
using System.Xml.Linq;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Collections.Generic;
using System.Linq;

namespace SshNetWebTerminal.Forms;

public partial class MainForm : Form
{
    private readonly Microsoft.Web.WebView2.WinForms.WebView2 webView;
    private readonly string baseUrl;
    private bool isDarkTheme = true;
    private readonly string configPath;
    private Panel? secondarySidebarPanel;
    private TreeView? connectionTreeView;
    private bool isSecondarySidebarVisible = false;
    private List<ConnectionConfig> connections = new();
    private bool isDoubleClickExpanding = false;
    private ConfigRoot config = new();
    
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
        
        configPath = Path.Combine(
            Path.GetDirectoryName(Application.ExecutablePath) ?? "",
            "config.json"
        );
        
        LoadConnections();
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

    private void settingsButton_Click(object sender, EventArgs e)
    {
        using var settingsForm = new SettingsForm(config, SaveConnections);
        settingsForm.StartPosition = FormStartPosition.CenterParent;
        if (settingsForm.ShowDialog(this) == DialogResult.OK)
        {
            // 应用语言设置
            ApplyLanguageSettings();
        }
    }

    private void ApplyLanguageSettings()
    {
        // TODO: 实现语言切换逻辑
        // 这里需要根据 config.Settings.Language 的值
        // 切换界面语言
    }

    private void themeButton_Click(object sender, EventArgs e)
    {
        isDarkTheme = !isDarkTheme;
        themeButton.Image = GetThemeIcon(isDarkTheme);
        
        // 更新侧边栏颜色
        sidebarPanel.BackColor = isDarkTheme ? 
            Color.FromArgb(51, 51, 51) : // 深色主题
            Color.FromArgb(240, 240, 240); // 浅色主题
        
        // 更新按钮前景色
        settingsButton.ForeColor = isDarkTheme ? Color.White : Color.Black;
        themeButton.ForeColor = isDarkTheme ? Color.White : Color.Black;
        connectionsButton.ForeColor = isDarkTheme ? Color.White : Color.Black;
        
        // 更新按钮悬停颜色
        settingsButton.FlatAppearance.MouseOverBackColor = isDarkTheme ?
            Color.FromArgb(70, 70, 70) : // 深色主题悬停色
            Color.FromArgb(220, 220, 220); // 浅色主题悬停色
        
        themeButton.FlatAppearance.MouseOverBackColor = isDarkTheme ?
            Color.FromArgb(70, 70, 70) : // 深色主题悬停色
            Color.FromArgb(220, 220, 220); // 浅色主题悬停色
        
        connectionsButton.FlatAppearance.MouseOverBackColor = isDarkTheme ?
            Color.FromArgb(70, 70, 70) : // 深色主题悬停色
            Color.FromArgb(220, 220, 220); // 浅色主题悬停色
        
        // 重新生成图标以匹配新主题
        settingsButton.Image = GetSettingsIcon(isDarkTheme);
        themeButton.Image = GetThemeIcon(isDarkTheme);
        connectionsButton.Image = GetConnectionsIcon(isDarkTheme);
        
        // 通过 JavaScript 切换 WebView 的主题
        string script = isDarkTheme ? 
            "document.body.classList.remove('light-theme');" : 
            "document.body.classList.add('light-theme');";
        
        webView.CoreWebView2.ExecuteScriptAsync(script);

        // 更新侧边栏主题
        if (secondarySidebarPanel != null)
        {
            secondarySidebarPanel.BackColor = isDarkTheme ? 
                Color.FromArgb(45, 45, 45) : Color.FromArgb(245, 245, 245);
            
            foreach (Control control in secondarySidebarPanel.Controls)
            {
                if (control is TreeView treeView)
                {
                    treeView.BackColor = isDarkTheme ? 
                        Color.FromArgb(45, 45, 45) : Color.FromArgb(245, 245, 245);
                    treeView.ForeColor = isDarkTheme ? Color.White : Color.Black;
                    treeView.Refresh(); // 强制重绘
                }
                else if (control is ToolStrip toolStrip)
                {
                    toolStrip.BackColor = isDarkTheme ? 
                        Color.FromArgb(45, 45, 45) : Color.FromArgb(245, 245, 245);
                    toolStrip.ForeColor = isDarkTheme ? Color.White : Color.Black;
                    toolStrip.Renderer = new CustomToolStripRenderer(isDarkTheme);
                }
                else if (control is Panel titlePanel)
                {
                    titlePanel.BackColor = isDarkTheme ? 
                        Color.FromArgb(51, 51, 51) : Color.FromArgb(240, 240, 240);
                    foreach (Control c in titlePanel.Controls)
                    {
                        if (c is Label label)
                        {
                            label.ForeColor = isDarkTheme ? Color.White : Color.Black;
                        }
                    }
                }
            }
        }

        // 更新图标
        if (connectionTreeView?.ImageList != null)
        {
            connectionTreeView.ImageList.Images.RemoveByKey("folder");
            connectionTreeView.ImageList.Images.RemoveByKey("connection");
            connectionTreeView.ImageList.Images.Add("folder", CreateFolderIcon(isDarkTheme));
            connectionTreeView.ImageList.Images.Add("connection", CreateConnectionIcon(isDarkTheme));
            
            // 强制刷新树视图
            connectionTreeView.Refresh();
        }
    }

    private void LoadConnections()
    {
        try
        {
            if (!File.Exists(configPath))
            {
                // 如果文件不存在，创建一个包含默认配置的文件
                config = new ConfigRoot
                {
                    Settings = new GlobalSettings(),
                    Connections = new List<ConnectionConfig>()
                };
                SaveConnections();
            }

            var json = File.ReadAllText(configPath);
            if (string.IsNullOrWhiteSpace(json))
            {
                // 如果文件为空，写入默认配置
                config = new ConfigRoot
                {
                    Settings = new GlobalSettings(),
                    Connections = new List<ConnectionConfig>()
                };
                SaveConnections();
            }
            else
            {
                config = JsonSerializer.Deserialize<ConfigRoot>(json) ?? new();
            }
            
            connections = config.Connections;
            UpdateConnectionTreeView();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"加载配置文件失败: {ex.Message}", "错误",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
            config = new ConfigRoot();
            connections = new List<ConnectionConfig>();
        }
    }
    
    private void SaveConnections()
    {
        try
        {
            config.Connections = connections;
            var json = JsonSerializer.Serialize(config, new JsonSerializerOptions 
            { 
                WriteIndented = true 
            });
            File.WriteAllText(configPath, json);
        }
        catch (Exception ex)
        {
            MessageBox.Show($"保存配置文件失败: {ex.Message}", "错误",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private void connectionsButton_Click(object sender, EventArgs e)
    {
        if (secondarySidebarPanel == null)
        {
            InitializeSecondarySidebar();
        }
        
        isSecondarySidebarVisible = !isSecondarySidebarVisible;
        secondarySidebarPanel!.Visible = isSecondarySidebarVisible;
        
        if (isSecondarySidebarVisible)
        {
            UpdateConnectionTreeView();
        }
    }
    
    private void InitializeSecondarySidebar()
    {
        secondarySidebarPanel = new Panel
        {
            Dock = DockStyle.Left,
            Width = 250,
            BackColor = isDarkTheme ? Color.FromArgb(45, 45, 45) : Color.FromArgb(245, 245, 245),
            Visible = false,
            Padding = new Padding(1, 0, 1, 1)  // 添加边框效果
        };

        // 创建标题栏
        var titlePanel = new Panel
        {
            Dock = DockStyle.Top,
            Height = 40,
            BackColor = isDarkTheme ? Color.FromArgb(51, 51, 51) : Color.FromArgb(240, 240, 240),
        };

        var titleLabel = new Label
        {
            Text = "连接管理",
            Font = new Font("Microsoft YaHei UI", 10F, FontStyle.Regular),
            ForeColor = isDarkTheme ? Color.White : Color.Black,
            Dock = DockStyle.Fill,
            TextAlign = ContentAlignment.MiddleLeft,
            Padding = new Padding(10, 0, 0, 0)
        };

        titlePanel.Controls.Add(titleLabel);

        // 创建树形视图
        var imageList = new ImageList();
        imageList.Images.Add("folder", CreateFolderIcon(isDarkTheme));
        imageList.Images.Add("connection", CreateConnectionIcon(isDarkTheme));  // 添加连接图标
        
        connectionTreeView = new TreeView
        {
            Dock = DockStyle.Fill,
            BackColor = isDarkTheme ? Color.FromArgb(45, 45, 45) : Color.FromArgb(245, 245, 245),
            ForeColor = isDarkTheme ? Color.White : Color.Black,
            BorderStyle = BorderStyle.None,
            Indent = 24,
            ItemHeight = 28,
            ShowLines = true,
            ShowPlusMinus = false,
            ImageList = imageList,
            Font = new Font("Microsoft YaHei UI", 9F),
            HideSelection = false,
            FullRowSelect = true,
            LineColor = isDarkTheme ? Color.FromArgb(70, 70, 70) : Color.FromArgb(220, 220, 220)
        };

        // 修改事件绑定
        connectionTreeView.MouseUp += ConnectionTreeView_MouseUp;
        connectionTreeView.NodeMouseDoubleClick += ConnectionTreeView_NodeDoubleClick;
        connectionTreeView.KeyDown += ConnectionTreeView_KeyDown;
        connectionTreeView.DrawNode += ConnectionTreeView_DrawNode;
        // 移除单击展开事件
        connectionTreeView.BeforeExpand += ConnectionTreeView_BeforeExpand;
        connectionTreeView.BeforeCollapse += ConnectionTreeView_BeforeCollapse;

        // 组装控件
        secondarySidebarPanel.Controls.Add(connectionTreeView);
        secondarySidebarPanel.Controls.Add(titlePanel);

        Controls.Add(secondarySidebarPanel);
        secondarySidebarPanel.BringToFront();
    }

    private void UpdateConnectionTreeView()
    {
        if (connectionTreeView == null) return;
        
        connectionTreeView.Nodes.Clear();
        foreach (var config in connections)
        {
            var node = CreateTreeNode(config);
            connectionTreeView.Nodes.Add(node);
        }
    }

    private TreeNode CreateTreeNode(ConnectionConfig config)
    {
        var node = new TreeNode(config.Name)
        {
            Tag = config,
            ImageIndex = config.Type == "folder" ? 0 : 1,  // 0 为文件夹图标，1 为连接图标
            SelectedImageIndex = config.Type == "folder" ? 0 : 1  // 选中时使用相同的图标
        };

        foreach (var child in config.Children)
        {
            node.Nodes.Add(CreateTreeNode(child));
        }

        return node;
    }

    private void AddFolder_Click(object? sender, EventArgs e)
    {
        using var dialog = new TextInputDialog("新建文件夹", "请输入文件夹名称:");
        if (dialog.ShowDialog() == DialogResult.OK)
        {
            var folder = new ConnectionConfig
            {
                Name = dialog.InputText,
                Type = "folder"
            };

            var selectedNode = connectionTreeView?.SelectedNode;
            if (selectedNode != null && 
                ((ConnectionConfig)selectedNode.Tag).Type == "folder" && 
                sender is ToolStripItem menuItem && 
                menuItem.OwnerItem == null &&
                selectedNode == connectionTreeView.GetNodeAt(connectionTreeView.PointToClient(menuItem.Owner.Location)))
            {
                ((ConnectionConfig)selectedNode.Tag).Children.Add(folder);
                selectedNode.Nodes.Add(CreateTreeNode(folder));
            }
            else
            {
                connections.Add(folder);
                connectionTreeView?.Nodes.Add(CreateTreeNode(folder));
            }

            SaveConnections();
        }
    }

    private void AddConnection_Click(object? sender, EventArgs e)
    {
        using var dialog = new ConnectionDialog();
        if (dialog.ShowDialog() == DialogResult.OK)
        {
            var connection = dialog.GetConnectionConfig();
            
            var selectedNode = connectionTreeView?.SelectedNode;
            if (selectedNode != null && 
                ((ConnectionConfig)selectedNode.Tag).Type == "folder" && 
                sender is ToolStripItem menuItem && 
                menuItem.OwnerItem == null &&
                selectedNode == connectionTreeView.GetNodeAt(connectionTreeView.PointToClient(menuItem.Owner.Location)))
            {
                ((ConnectionConfig)selectedNode.Tag).Children.Add(connection);
                selectedNode.Nodes.Add(CreateTreeNode(connection));
            }
            else
            {
                connections.Add(connection);
                connectionTreeView?.Nodes.Add(CreateTreeNode(connection));
            }

            SaveConnections();
        }
    }

    private void ConnectionTreeView_NodeDoubleClick(object? sender, TreeNodeMouseClickEventArgs e)
    {
        if (e.Node?.Tag == null) return;

        var config = (ConnectionConfig)e.Node.Tag;
        if (config.Type == "folder")
        {
            // 设置标志，允许展开/折叠
            isDoubleClickExpanding = true;
            e.Node.Toggle();
            isDoubleClickExpanding = false;
        }
        else if (config.Type == "connection")
        {
            // TODO: 实现连接逻辑
            MessageBox.Show($"连接到: {config.Host}:{config.Port}");
        }
    }

    private void ConnectionTreeView_KeyDown(object? sender, KeyEventArgs e)
    {
        if (e.KeyCode != Keys.Delete || connectionTreeView?.SelectedNode?.Tag == null) return;
        
        if (MessageBox.Show("确定要删除选中项吗？", "确认删除",
            MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
        {
            var node = connectionTreeView.SelectedNode;
            var config = (ConnectionConfig)node.Tag;
            
            if (node.Parent != null)
            {
                var parentConfig = (ConnectionConfig)node.Parent.Tag;
                parentConfig.Children.Remove(config);
            }
            else
            {
                connections.Remove(config);
            }
            
            node.Remove();
            SaveConnections();
        }
    }

    private void ConnectionTreeView_MouseUp(object? sender, MouseEventArgs e)
    {
        if (connectionTreeView == null) return;

        // 获取鼠标点击位置的节点
        var hitTest = connectionTreeView.HitTest(e.Location);
        
        // 如果点击到了节点，选中该节点；如果点击到空白处，取消选中
        if (hitTest.Node != null)
        {
            connectionTreeView.SelectedNode = hitTest.Node;
        }
        else
        {
            connectionTreeView.SelectedNode = null;
        }

        // 处理右键点击
        if (e.Button == MouseButtons.Right)
        {
            if (hitTest.Node != null)
            {
                // 点击节点，显示节点上下文菜单
                var config = (ConnectionConfig)hitTest.Node.Tag;
                var contextMenu = new ContextMenuStrip();
                
                // 如果是文件夹，添加新建选项
                if (config.Type == "folder")
                {
                    contextMenu.Items.Add("新建文件夹", CreateFolderIcon(isDarkTheme), (s, args) => AddFolder_Click(s, args));
                    contextMenu.Items.Add("新建连接", CreateConnectionIcon(isDarkTheme), (s, args) => AddConnection_Click(s, args));
                    contextMenu.Items.Add("-");
                }
                
                // 添加通用选项
                contextMenu.Items.Add("重命名", null, (s, args) => 
                {
                    using var dialog = new TextInputDialog("重命名", "请输入新名称:", config.Name);
                    if (dialog.ShowDialog() == DialogResult.OK)
                    {
                        config.Name = dialog.InputText;
                        hitTest.Node.Text = dialog.InputText;
                        SaveConnections();
                    }
                });
                
                contextMenu.Items.Add("删除", null, (s, args) =>
                {
                    if (MessageBox.Show("确定要删除选中项吗？", "确认删除",
                        MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
                    {
                        if (hitTest.Node.Parent != null)
                        {
                            var parentConfig = (ConnectionConfig)hitTest.Node.Parent.Tag;
                            parentConfig.Children.Remove(config);
                        }
                        else
                        {
                            connections.Remove(config);
                        }
                        hitTest.Node.Remove();
                        SaveConnections();
                    }
                });
                
                // 设置菜单项样式
                foreach (ToolStripItem item in contextMenu.Items)
                {
                    if (item is ToolStripSeparator) continue;
                    item.BackColor = isDarkTheme ? Color.FromArgb(45, 45, 45) : Color.FromArgb(245, 245, 245);
                    item.ForeColor = isDarkTheme ? Color.White : Color.Black;
                }
                
                contextMenu.Renderer = new CustomToolStripRenderer(isDarkTheme);
                contextMenu.Show(connectionTreeView, e.Location);
            }
            else
            {
                // 点击空白区域，显示新建菜单
                var contextMenu = new ContextMenuStrip();
                contextMenu.Items.Add("新建文件夹", CreateFolderIcon(isDarkTheme), (s, args) => AddFolder_Click(s, args));
                contextMenu.Items.Add("新建连接", CreateConnectionIcon(isDarkTheme), (s, args) => AddConnection_Click(s, args));
                
                // 设置菜单项样式
                foreach (ToolStripItem item in contextMenu.Items)
                {
                    item.BackColor = isDarkTheme ? Color.FromArgb(45, 45, 45) : Color.FromArgb(245, 245, 245);
                    item.ForeColor = isDarkTheme ? Color.White : Color.Black;
                }
                
                contextMenu.Renderer = new CustomToolStripRenderer(isDarkTheme);
                contextMenu.Show(connectionTreeView, e.Location);
            }
        }
    }

    // 自定义工具栏渲染器
    private class CustomToolStripRenderer : ToolStripProfessionalRenderer
    {
        private readonly bool isDarkTheme;

        public CustomToolStripRenderer(bool isDarkTheme)
        {
            this.isDarkTheme = isDarkTheme;
        }

        protected override void OnRenderToolStripBackground(ToolStripRenderEventArgs e)
        {
            using var brush = new SolidBrush(isDarkTheme ? Color.FromArgb(45, 45, 45) : Color.FromArgb(245, 245, 245));
            e.Graphics.FillRectangle(brush, e.AffectedBounds);
        }

        protected override void OnRenderButtonBackground(ToolStripItemRenderEventArgs e)
        {
            if (e.Item.Selected || e.Item.Pressed)
            {
                var bounds = new Rectangle(0, 0, e.Item.Width, e.Item.Height);
                var color = isDarkTheme ? Color.FromArgb(70, 70, 70) : Color.FromArgb(220, 220, 220);
                using var brush = new SolidBrush(color);
                e.Graphics.FillRectangle(brush, bounds);
            }
        }
    }

    // 树形视图节点绘制事件
    private void ConnectionTreeView_DrawNode(object? sender, DrawTreeNodeEventArgs e)
    {
        if (e.Node?.Tag == null || connectionTreeView == null) return;

        var selected = (e.State & TreeNodeStates.Selected) == TreeNodeStates.Selected;
        var focused = (e.State & TreeNodeStates.Focused) == TreeNodeStates.Focused;
        var config = (ConnectionConfig)e.Node.Tag;
        var hot = e.Node == connectionTreeView.GetNodeAt(connectionTreeView.PointToClient(Cursor.Position));
        
        // 绘制选中或悬停背景
        if (selected || hot)
        {
            var backColor = selected ?
                (focused ? 
                    (isDarkTheme ? Color.FromArgb(70, 70, 70) : Color.FromArgb(220, 220, 220)) :
                    (isDarkTheme ? Color.FromArgb(60, 60, 60) : Color.FromArgb(230, 230, 230))) :
                (isDarkTheme ? Color.FromArgb(55, 55, 55) : Color.FromArgb(235, 235, 235));
            
            using var brush = new SolidBrush(backColor);
            e.Graphics.FillRectangle(brush, new Rectangle(0, e.Bounds.Y, connectionTreeView.Width, e.Bounds.Height));
        }
        
        // 计算文本和图标位置
        int indent = e.Node.Level * connectionTreeView.Indent;
        var textX = e.Bounds.X + indent;
        
        // 绘制图标
        if (connectionTreeView.ImageList != null)
        {
            var icon = connectionTreeView.ImageList.Images[config.Type == "folder" ? 0 : 1];
            e.Graphics.DrawImage(icon, textX, e.Bounds.Y + (e.Bounds.Height - icon.Height) / 2);
            textX += icon.Width + 4; // 图标宽度 + 间距
        }
        
        // 绘制文本
        var font = config.Type == "folder" ? 
            new Font(e.Node.TreeView.Font, FontStyle.Bold) :
            e.Node.TreeView.Font;
        
        TextRenderer.DrawText(
            e.Graphics,
            e.Node.Text,
            font,
            new Point(textX, e.Bounds.Y + (e.Bounds.Height - font.Height) / 2),
            e.Node.TreeView.ForeColor,
            TextFormatFlags.SingleLine | TextFormatFlags.VerticalCenter
        );
    }

    // 添加展开/折叠前的事件处理
    private void ConnectionTreeView_BeforeExpand(object? sender, TreeViewCancelEventArgs e)
    {
        // 如果不是通过双击触发的展开，则取消展开
        if (!isDoubleClickExpanding)
        {
            e.Cancel = true;
        }
    }

    private void ConnectionTreeView_BeforeCollapse(object? sender, TreeViewCancelEventArgs e)
    {
        // 如果不是通过双击触发的折叠，则取消折叠
        if (!isDoubleClickExpanding)
        {
            e.Cancel = true;
        }
    }

    // 添加创建文件夹图标的方法
    private Image CreateFolderIcon(bool isDark)
    {
        var iconSize = 16;
        var bitmap = new Bitmap(iconSize, iconSize);
        using var g = Graphics.FromImage(bitmap);
        g.SmoothingMode = SmoothingMode.AntiAlias;
        
        var color = isDark ? Color.White : Color.Black;
        using var pen = new Pen(color, 1.2f);
        
        // 绘制文件夹主体
        var folderBody = new Rectangle(1, 4, 13, 9);
        using (var path = new GraphicsPath())
        {
            path.AddRectangle(folderBody);
            g.DrawPath(pen, path);
            
            // 添加轻微的渐变效果
            using var brush = new LinearGradientBrush(
                folderBody,
                Color.FromArgb(30, color),
                Color.FromArgb(10, color),
                LinearGradientMode.Vertical);
            g.FillPath(brush, path);
        }
        
        // 绘制文件夹顶部
        var points = new Point[]
        {
            new Point(1, 4),    // 左下
            new Point(5, 4),    // 中下
            new Point(7, 2),    // 中上
            new Point(14, 2),   // 右上
            new Point(14, 4)    // 右下
        };
        g.DrawLines(pen, points);
        
        return bitmap;
    }

    private Image CreateConnectionIcon(bool isDark)
    {
        var iconSize = 16;
        var bitmap = new Bitmap(iconSize, iconSize);
        using var g = Graphics.FromImage(bitmap);
        g.SmoothingMode = SmoothingMode.AntiAlias;
        
        var color = isDark ? Color.White : Color.Black;
        using var pen = new Pen(color, 1.2f);
        
        // 绘制终端显示器
        var monitor = new Rectangle(2, 1, 12, 9);
        g.DrawRectangle(pen, monitor);
        
        // 绘制显示器内容（终端界面效果）
        g.DrawLine(pen, 4, 4, 12, 4);
        g.DrawLine(pen, 4, 6, 10, 6);
        
        // 绘制显示器底座
        var standPoints = new Point[]
        {
            new Point(6, 10),   // 左上
            new Point(10, 10),  // 右上
            new Point(11, 14),  // 右下
            new Point(5, 14)    // 左下
        };
        g.DrawPolygon(pen, standPoints);
        
        return bitmap;
    }

    private Image GetSettingsIcon(bool isDark)
    {
        var svg = File.ReadAllText(Path.Combine(
            Path.GetDirectoryName(Application.ExecutablePath) ?? "",
            "Resources",
            isDark ? "gear-fill.svg" : "gear.svg"
        ));
        return ConvertSvgToImage(svg, isDark);
    }

    private Image GetThemeIcon(bool isDark)
    {
        var svg = File.ReadAllText(Path.Combine(
            Path.GetDirectoryName(Application.ExecutablePath) ?? "",
            "Resources",
            isDark ? "moon-stars.svg" : "sun.svg"
        ));
        return ConvertSvgToImage(svg, isDark);
    }

    private Image GetConnectionsIcon(bool isDark)
    {
        var svg = File.ReadAllText(Path.Combine(
            Path.GetDirectoryName(Application.ExecutablePath) ?? "",
            "Resources",
            isDark ? "connection-fill.svg" : "connection.svg"
        ));
        return ConvertSvgToImage(svg, isDark);
    }

    private Image ConvertSvgToImage(string svg, bool isDark)
    {
        // 替换SVG颜色
        svg = svg.Replace("currentColor", isDark ? "#FFFFFF" : "#000000");
        
        using var stream = new MemoryStream();
        using var writer = new StreamWriter(stream);
        writer.Write(svg);
        writer.Flush();
        stream.Position = 0;
        
        var svgDocument = Svg.SvgDocument.Open<Svg.SvgDocument>(stream);
        return svgDocument.Draw(20, 20); // 统一设置图标大小为20x20
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