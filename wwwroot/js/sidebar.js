let config = {
    folders: [],
    connections: []
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    loadConfig();
    initializeSidebar();
});

// 加载配置
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        config = await response.json();
        renderSidebar();
    } catch (error) {
        console.error('加载配置失败:', error);
    }
}

// 保存配置
async function saveConfig() {
    try {
        await fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
    } catch (error) {
        console.error('保存配置失败:', error);
    }
}

// 初始化侧边栏
function initializeSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');

    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('full-width');
        
        const icon = this.querySelector('i');
        if (sidebar.classList.contains('collapsed')) {
            icon.classList.replace('bi-chevron-left', 'bi-chevron-right');
            this.setAttribute('title', '展开');
        } else {
            icon.classList.replace('bi-chevron-right', 'bi-chevron-left');
            this.setAttribute('title', '收起');
        }
    });
}

// 渲染侧边栏
function renderSidebar() {
    const folderList = document.getElementById('folderList');
    folderList.innerHTML = '';

    config.folders.forEach(folder => {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder-container';
        folderDiv.innerHTML = `
            <div class="folder-item" data-folder-id="${folder.id}">
                <div class="folder-header">
                    <i class="bi bi-folder"></i>
                    <span>${folder.name}</span>
                    <div class="folder-initial">${folder.name.charAt(0).toUpperCase()}</div>
                </div>
                <i class="bi bi-chevron-right folder-toggle"></i>
            </div>
            <div class="folder-content" id="folder-${folder.id}">
                <div class="connections-list">
                    ${renderConnections(folder.id)}
                </div>
                <div class="folder-actions">
                    <button class="btn btn-sm btn-outline-primary w-100" onclick="showAddConnectionDialog('${folder.id}')">
                        <i class="bi bi-plus-circle"></i> 添加连接
                    </button>
                </div>
            </div>
        `;
        folderList.appendChild(folderDiv);

        // 添加文件夹展开/折叠事件
        const folderItem = folderDiv.querySelector('.folder-item');
        folderItem.addEventListener('click', function(e) {
            if (!document.getElementById('sidebar').classList.contains('collapsed')) {
                const content = this.nextElementSibling;
                const toggle = this.querySelector('.folder-toggle');
                content.classList.toggle('show');
                toggle.classList.toggle('bi-chevron-right');
                toggle.classList.toggle('bi-chevron-down');
            }
        });
    });
}

// 渲染连接列表
function renderConnections(folderId) {
    const connections = config.connections.filter(conn => conn.folderId === folderId);
    return connections.map(conn => `
        <div class="connection-item" onclick="loadConnection(${JSON.stringify(conn)})">
            <i class="bi bi-terminal"></i>
            <span>${conn.name}</span>
        </div>
    `).join('');
}

// 添加文件夹
function addFolder() {
    const name = prompt('请输入文件夹名称:');
    if (name) {
        config.folders.push({
            id: Date.now().toString(),
            name: name
        });
        saveConfig();
        renderSidebar();
    }
}

// 显示添加连接对话框
function showAddConnectionDialog(folderId) {
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">添加新连接</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="connectionForm">
                        <div class="mb-3">
                            <label class="form-label">连接名称</label>
                            <input type="text" class="form-control" id="connName" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">主机地址</label>
                            <input type="text" class="form-control" id="connHost" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">用户名</label>
                            <input type="text" class="form-control" id="connUsername" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">密码</label>
                            <input type="password" class="form-control" id="connPassword" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                    <button type="button" class="btn btn-primary" onclick="saveConnection('${folderId}')">保存</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 显示模态框
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();

    // 模态框关闭后清理DOM
    modal.addEventListener('hidden.bs.modal', function() {
        document.body.removeChild(modal);
    });
}

// 保存连接
function saveConnection(folderId) {
    const name = document.getElementById('connName').value;
    const host = document.getElementById('connHost').value;
    const username = document.getElementById('connUsername').value;
    const password = document.getElementById('connPassword').value;

    if (name && host && username && password) {
        config.connections.push({
            id: Date.now().toString(),
            folderId: folderId,
            name: name,
            host: host,
            username: username,
            password: password
        });
        saveConfig();
        renderSidebar();
        bootstrap.Modal.getInstance(document.querySelector('.modal')).hide();
    }
}

// 加载连接配置
function loadConnection(conn) {
    document.getElementById('host').value = conn.host;
    document.getElementById('user').value = conn.username;
    document.getElementById('pass').value = conn.password;
    // 自动连接
    document.getElementById('connectBtn').click();
} 