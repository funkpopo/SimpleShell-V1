# SimpleShell

本项目前端基于Vue3 + Xterm.js + node-pty + Electron开发，实现一个Windows平台的SSH客户端GUI应用程序，具有直观友好的用户界面。

- 通过Vue + JavaScript实现显示页面
- 使用Xterm.js + node-pty实现网页终端功能
- 可以文件夹式管理多个安全可靠的SSH连接

## 使用说明
使用左侧菜单添加和管理SSH连接
点击连接以打开新的终端标签页
在终端界面与远程服务器实时交互

## 配置文件

SSH连接配置保存在 `config.json` 文件中。该文件包含了所有保存的SSH连接信息。出于安全考虑，该文件不会被提交到版本控制系统。

如果该文件不存在，应用程序会自动创建它。

## 开发

- Vue 3 + Xterm.js + node-pty + Electron

## 安装依赖

1. 安装前端依赖：
   ```
   npm install
   ```

## 运行项目（测试）

1. 启动开发服务器：
   ```
   npm run serve
   ```

3. 测试electron
   ```
   npm run electron:serve
   ```

---

## 编译打包

1. 编译前端
   ```
   # 默认打包为win x64
   npm run electron:build
   # Windows平台打包
   npm run electron:build:win
   # Linux平台打包
   npm run electron:build:linux
   ```
