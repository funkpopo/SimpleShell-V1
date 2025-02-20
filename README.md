# SimpleShell

A modern SSH client GUI application built with Vue3 + Electron.

## Features

- Beautiful and intuitive user interface
- Multi-tab terminal support
- File manager with tree view
- System resource monitoring
- Secure SSH connection management

## Tech Stack

- Vue 3
- TypeScript
- Electron
- Element Plus
- Xterm.js
- node-pty

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Run in development mode:
```bash
npm run electron:serve
```

3. Build for production:
```bash
# Build for Windows
npm run electron:build:win

# Build for Linux
npm run electron:build:linux
```

## Project Structure

```
src/
  ├── components/        # Vue components
  │   ├── FileManager.vue
  │   ├── TabTerminal.vue
  │   └── SystemMonitor.vue
  ├── router/           # Vue Router configuration
  ├── store/            # State management
  ├── utils/            # Utility functions
  ├── App.vue           # Root component
  ├── main.ts           # Vue entry point
  └── background.ts     # Electron main process
```

## Configuration

- Vue configuration: `vue.config.js`
- TypeScript configuration: `tsconfig.json`
- Environment variables: `.env`

## License

MIT 