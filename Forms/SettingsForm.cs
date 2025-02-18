using System;
using System.Windows.Forms;
using System.Drawing;
using DotnetTerminal.Models;

namespace DotnetTerminal.Forms
{
    public partial class SettingsForm : Form
    {
        private readonly ConfigRoot config;
        private readonly Action saveConfig;
        private ComboBox languageComboBox = null!;
        private Button okButton = null!;
        private Button cancelButton = null!;

        public SettingsForm(ConfigRoot config, Action saveConfig)
        {
            this.config = config;
            this.saveConfig = saveConfig;
            InitializeComponent();
            InitializeCustomComponents();
            LoadSettings();
        }

        private void InitializeCustomComponents()
        {
            Text = "设置";
            Size = new Size(400, 300);
            FormBorderStyle = FormBorderStyle.FixedDialog;
            StartPosition = FormStartPosition.CenterParent;
            MaximizeBox = false;
            MinimizeBox = false;

            var layout = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                Padding = new Padding(10),
                RowCount = 3,
                ColumnCount = 2
            };

            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 30));
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 70));

            // 语言选择
            layout.Controls.Add(new Label { Text = "语言:", Dock = DockStyle.Fill }, 0, 0);
            languageComboBox = new ComboBox
            {
                Dock = DockStyle.Fill,
                DropDownStyle = ComboBoxStyle.DropDownList
            };
            languageComboBox.Items.AddRange(new string[] { "简体中文", "English" });
            languageComboBox.SelectedIndex = 0; // 默认选中简体中文
            layout.Controls.Add(languageComboBox, 1, 0);

            // 按钮面板
            var buttonPanel = new FlowLayoutPanel
            {
                Dock = DockStyle.Fill,
                FlowDirection = FlowDirection.RightToLeft
            };

            okButton = new Button { Text = "确定", DialogResult = DialogResult.OK };
            cancelButton = new Button { Text = "取消", DialogResult = DialogResult.Cancel };

            buttonPanel.Controls.AddRange(new Control[] { cancelButton, okButton });
            layout.Controls.Add(buttonPanel, 1, 2);

            Controls.Add(layout);

            // 绑定保存事件
            okButton.Click += (s, e) => SaveSettings();
        }

        private void LoadSettings()
        {
            if (languageComboBox != null)
            {
                languageComboBox.SelectedItem = config.Settings.Language;
            }
        }

        private void SaveSettings()
        {
            config.Settings.Language = languageComboBox.SelectedItem.ToString()!;
            saveConfig();
        }
    }
} 