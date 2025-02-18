namespace SshNetWebTerminal.Forms;

partial class MainForm
{
    private System.ComponentModel.IContainer components = null;
    private Button settingsButton;
    private Button themeButton;  // 添加主题切换按钮
    private Panel sidebarPanel;  // 添加侧边栏面板
    private Button connectionsButton;

    protected override void Dispose(bool disposing)
    {
        if (disposing && (components != null))
        {
            components.Dispose();
        }
        base.Dispose(disposing);
    }

    private void InitializeComponent()
    {
        this.components = new System.ComponentModel.Container();
        
        // 初始化侧边栏面板
        this.sidebarPanel = new Panel();
        this.sidebarPanel.Dock = DockStyle.Left;
        this.sidebarPanel.Width = 60;
        this.sidebarPanel.BackColor = Color.FromArgb(51, 51, 51);
        this.Controls.Add(this.sidebarPanel);
        
        // 初始化设置按钮
        this.settingsButton = new Button();
        this.settingsButton.FlatStyle = FlatStyle.Flat;
        this.settingsButton.FlatAppearance.BorderSize = 0;
        this.settingsButton.BackColor = Color.Transparent;
        this.settingsButton.ForeColor = Color.White;
        this.settingsButton.Size = new System.Drawing.Size(40, 40);
        this.settingsButton.Location = new System.Drawing.Point(10, 10);
        this.settingsButton.Image = GetSettingsIcon(true);
        this.settingsButton.ImageAlign = ContentAlignment.MiddleCenter;
        this.settingsButton.Cursor = Cursors.Hand;
        this.settingsButton.Text = "";
        
        // 初始化主题切换按钮
        this.themeButton = new Button();
        this.themeButton.FlatStyle = FlatStyle.Flat;
        this.themeButton.FlatAppearance.BorderSize = 0;
        this.themeButton.BackColor = Color.Transparent;
        this.themeButton.ForeColor = Color.White;
        this.themeButton.Size = new System.Drawing.Size(40, 40);
        this.themeButton.Location = new System.Drawing.Point(10, 60);
        this.themeButton.Image = GetThemeIcon(true);
        this.themeButton.ImageAlign = ContentAlignment.MiddleCenter;
        this.themeButton.Cursor = Cursors.Hand;
        this.themeButton.Text = "";
        
        // 初始化连接管理按钮
        this.connectionsButton = new Button();
        this.connectionsButton.FlatStyle = FlatStyle.Flat;
        this.connectionsButton.FlatAppearance.BorderSize = 0;
        this.connectionsButton.BackColor = Color.Transparent;
        this.connectionsButton.ForeColor = Color.White;
        this.connectionsButton.Size = new System.Drawing.Size(40, 40);
        this.connectionsButton.Location = new System.Drawing.Point(10, 110);
        this.connectionsButton.Image = GetConnectionsIcon(true);
        this.connectionsButton.ImageAlign = ContentAlignment.MiddleCenter;
        this.connectionsButton.Cursor = Cursors.Hand;
        this.connectionsButton.Text = "";
        
        // 添加鼠标悬停效果
        this.settingsButton.MouseEnter += (s, e) => {
            this.settingsButton.BackColor = Color.FromArgb(70, 70, 70);
        };
        this.settingsButton.MouseLeave += (s, e) => {
            this.settingsButton.BackColor = Color.Transparent;
        };
        
        this.themeButton.MouseEnter += (s, e) => {
            this.themeButton.BackColor = Color.FromArgb(70, 70, 70);
        };
        this.themeButton.MouseLeave += (s, e) => {
            this.themeButton.BackColor = Color.Transparent;
        };
        
        this.connectionsButton.MouseEnter += (s, e) => {
            this.connectionsButton.BackColor = Color.FromArgb(70, 70, 70);
        };
        this.connectionsButton.MouseLeave += (s, e) => {
            this.connectionsButton.BackColor = Color.Transparent;
        };
        
        this.sidebarPanel.Controls.Add(this.settingsButton);
        this.sidebarPanel.Controls.Add(this.themeButton);
        this.sidebarPanel.Controls.Add(this.connectionsButton);
        
        // WebView2 控件位置调整
        if (this.webView != null)
        {
            this.webView.Dock = DockStyle.Fill;
        }
        
        this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
        this.ClientSize = new System.Drawing.Size(1024, 768);
        this.Text = "SSH Web Terminal";
        this.WindowState = FormWindowState.Normal;
        
        this.settingsButton.Click += new System.EventHandler(this.settingsButton_Click);
        this.themeButton.Click += new System.EventHandler(this.themeButton_Click);
        this.connectionsButton.Click += new System.EventHandler(this.connectionsButton_Click);
    }
} 