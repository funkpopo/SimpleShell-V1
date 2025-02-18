using System;
using System.Windows.Forms;
using System.Drawing;
using DotnetTerminal.Models;

namespace DotnetTerminal.Forms;

public class ConnectionDialog : Form
{
    private TextBox nameTextBox = null!;
    private TextBox hostTextBox = null!;
    private NumericUpDown portNumeric = null!;
    private TextBox usernameTextBox = null!;
    private TextBox passwordTextBox = null!;
    private Button okButton = null!;
    private Button cancelButton = null!;

    public ConnectionDialog()
    {
        InitializeComponent();
    }

    private void InitializeComponent()
    {
        Text = "新建连接";
        Size = new Size(400, 300);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(10),
            RowCount = 7,
            ColumnCount = 2
        };

        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 30));
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 70));

        // 添加控件
        AddFormField(layout, "名称:", nameTextBox = new TextBox(), 0);
        AddFormField(layout, "主机:", hostTextBox = new TextBox(), 1);
        AddFormField(layout, "端口:", portNumeric = new NumericUpDown 
        { 
            Minimum = 1,
            Maximum = 65535,
            Value = 22
        }, 2);
        AddFormField(layout, "用户名:", usernameTextBox = new TextBox(), 3);
        AddFormField(layout, "密码:", passwordTextBox = new TextBox { UseSystemPasswordChar = true }, 4);

        var buttonPanel = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.RightToLeft
        };

        okButton = new Button { Text = "确定", DialogResult = DialogResult.OK };
        cancelButton = new Button { Text = "取消", DialogResult = DialogResult.Cancel };

        buttonPanel.Controls.AddRange(new Control[] { cancelButton, okButton });
        layout.Controls.Add(buttonPanel, 1, 5);

        Controls.Add(layout);
    }

    private void AddFormField(TableLayoutPanel layout, string label, Control control, int row)
    {
        layout.Controls.Add(new Label { Text = label, Dock = DockStyle.Fill }, 0, row);
        layout.Controls.Add(control, 1, row);
        control.Dock = DockStyle.Fill;
    }

    public ConnectionConfig GetConnectionConfig()
    {
        return new ConnectionConfig
        {
            Name = nameTextBox.Text,
            Type = "connection",
            Host = hostTextBox.Text,
            Port = (int)portNumeric.Value,
            Username = usernameTextBox.Text,
            Password = passwordTextBox.Text
        };
    }
} 