"use strict";

class TerminalManager {
    constructor() {
        this.connection = null;
        this.term = null;
        this.fitAddon = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
    }

    async initialize() {
        // 初始化 SignalR 连接
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl("/ssh")
            .withAutomaticReconnect()
            .build();

        // 设置事件处理器
        this.setupEventHandlers();
        
        // 初始化终端
        this.initializeTerminal();
        
        // 启动连接
        await this.connection.start();
    }

    setupEventHandlers() {
        this.connection.on("ReceiveMessage", (data) => {
            this.term.write(data);
        });

        this.connection.on("ConnectionEstablished", () => {
            this.connected = true;
            this.reconnectAttempts = 0;
            this.term.write("\r\n\x1b[32m连接成功\x1b[0m\r\n");
        });

        this.connection.on("ConnectionError", (error) => {
            this.connected = false;
            this.term.write(`\r\n\x1b[31m错误: ${error}\x1b[0m\r\n`);
        });

        this.connection.on("Disconnect", () => {
            this.connected = false;
            this.term.write("\r\n\x1b[33m连接已断开\x1b[0m\r\n");
        });

        this.connection.onreconnecting(() => {
            this.term.write("\r\n\x1b[33m正在重新连接...\x1b[0m\r\n");
        });

        // 处理终端输入
        this.term.onData(data => {
            if (this.connected) {
                this.connection.invoke("SendMessage", data).catch(err => {
                    console.error("发送消息失败:", err);
                });
            }
        });
    }

    initializeTerminal() {
        this.term = new Terminal({
            fontSize: 14,
            lineHeight: 1.2,
            theme: {
                background: '#000'
            }
        });

        this.fitAddon = new FitAddon.FitAddon();
        this.term.loadAddon(this.fitAddon);
        
        // 打开终端
        this.term.open(document.getElementById('terminal'));
        this.fitAddon.fit();
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.fitAddon.fit();
        });
    }

    async connect(configId) {
        try {
            console.log('开始建立连接:', configId);
            
            if (!this.connection.state) {
                console.log('正在启动 SignalR 连接...');
                await this.connection.start();
            }
            
            console.log('正在初始化终端连接...');
            await this.connection.invoke("InitializeConnection", configId);
            
            this.term.clear();
            this.term.focus();
            console.log('连接成功');
            return true;
        } catch (err) {
            console.error("连接失败:", err);
            this.term.write(`\r\n\x1b[31m连接失败: ${err.message}\x1b[0m\r\n`);
            return false;
        }
    }

    async disconnect() {
        if (this.connected) {
            try {
                await this.connection.invoke("Disconnect");
            } catch (err) {
                console.error("断开连接失败:", err);
            }
        }
    }
}

// 创建并导出实例
window.terminalManager = new TerminalManager();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    await window.terminalManager.initialize();
});

// 页面关闭前断开连接
window.addEventListener('beforeunload', () => {
    window.terminalManager.disconnect();
});