namespace SshNetWebTerminal.Forms;

public class TextInputDialog : Form
{
    private TextBox inputTextBox;
    public string InputText => inputTextBox.Text;

    public TextInputDialog(string title, string prompt, string initialValue = "")
    {
        Text = title;
        Size = new Size(300, 150);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(10),
            RowCount = 3,
            ColumnCount = 1
        };

        layout.Controls.Add(new Label { Text = prompt }, 0, 0);
        layout.Controls.Add(inputTextBox = new TextBox { Text = initialValue }, 0, 1);

        var buttonPanel = new FlowLayoutPanel
        {
            FlowDirection = FlowDirection.RightToLeft,
            Dock = DockStyle.Fill
        };

        var okButton = new Button { Text = "确定", DialogResult = DialogResult.OK };
        var cancelButton = new Button { Text = "取消", DialogResult = DialogResult.Cancel };

        buttonPanel.Controls.AddRange(new Control[] { cancelButton, okButton });
        layout.Controls.Add(buttonPanel, 0, 2);

        Controls.Add(layout);

        AcceptButton = okButton;
        CancelButton = cancelButton;
    }
} 