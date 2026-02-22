# GoSim - 围棋 AI 对弈模拟器

一个基于 Electron + React + TypeScript 的围棋 AI 对弈模拟器，支持多种 AI 引擎，可观看 AI 之间的对弈过程。

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

## ✨ 特性

- 🎮 **多引擎支持**: Mock、Pachi、GNU Go、KataGo、Leela Zero
- 🎯 **可调强度**: 10 级强度调节，适应不同水平需求
- 📐 **多种棋盘**: 支持 9×9、13×13、19×19 三种标准棋盘
- ⚡ **速度控制**: 10 档速度调节，从慢速观摩到快速对弈
- 📊 **实时统计**: 手数、提子、胜率等实时显示
- 🎨 **现代界面**: 基于 Ant Design 的美观 UI
- 🔧 **灵活配置**: 贴目、让子等规则可自定义

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- Windows 10+ / macOS 10.15+ / Linux

### 安装

```bash
# 克隆项目
git clone https://github.com/3aKHP/GoSim.git
cd GoSim

# 安装依赖
npm install
```

### 运行

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 运行生产版本
npm start
```

### 打包

```bash
# 打包当前平台
npm run package

# 打包 Windows
npm run package:win

# 打包 macOS
npm run package:mac

# 打包 Linux
npm run package:linux
```

## 📖 使用指南

详细使用说明请查看 [用户指南](docs/guide/USER_GUIDE.md)

### 基本使用流程

1. **选择 AI 引擎**
   - 在左侧控制面板选择黑方和白方的 AI 引擎
   - 推荐初次使用选择 "Mock 引擎" 进行快速测试

2. **配置对弈参数**
   - 选择棋盘大小（9×9、13×13、19×19）
   - 调整 AI 强度（1-10 级）
   - 设置贴目和让子（可选）

3. **开始对弈**
   - 点击 "开始对弈" 按钮
   - 使用速度滑块调整对弈速度
   - 可随时暂停、继续或停止

4. **查看统计**
   - 右侧面板显示实时统计信息
   - 包括手数、提子、当前回合等

## 🎯 AI 引擎说明

### Mock 引擎（内置）

- **特点**: 随机走子，无需额外配置
- **用途**: 快速测试、界面演示
- **性能**: 极快，几乎无延迟

### Pachi 引擎（已集成）

- **特点**: 基于 MCTS 算法，棋力可调
- **路径**: `engines/pachi/pachi.exe`
- **强度**: 1-10 级（1K-1M playouts）
- **棋力**: 业余初段到接近职业水平
- **文档**: [Pachi 集成文档](docs/guide/PACHI_INTEGRATION.md) | [故障排除](docs/guide/PACHI_TROUBLESHOOTING.md)

### KataGo 引擎（已集成）

- **特点**: 神经网络引擎，棋力最强，支持精确终局判定
- **路径**: `engines/katago/katago.exe`
- **模型**: `engines/katago/model.bin.gz`
- **配置**: `engines/katago/katago.cfg`
- **文档**: [KataGo 集成文档](docs/guide/KATAGO_INTEGRATION.md)

### 其他引擎（需配置）

- **GNU Go**: 经典开源引擎
- **Leela Zero**: 神经网络引擎

详细配置说明请查看 [Pachi 集成文档](docs/guide/PACHI_INTEGRATION.md) 和 [KataGo 集成文档](docs/guide/KATAGO_INTEGRATION.md)

## 🏗️ 项目结构

```
GoSim/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── gtp/          # GTP 引擎管理
│   │   │   ├── engine.ts
│   │   │   ├── katago-engine.ts
│   │   │   ├── mock-engine.ts
│   │   │   └── pachi-engine.ts
│   │   ├── utils/        # 工具类
│   │   │   ├── board.ts
│   │   │   ├── coordinate.ts
│   │   │   ├── game-logger.ts
│   │   │   ├── game-rules.ts
│   │   │   ├── path-manager.ts
│   │   │   └── sgf-manager.ts
│   │   ├── game-controller.ts
│   │   ├── ipc-handlers.ts
│   │   ├── settings-manager.ts
│   │   ├── preload.ts
│   │   └── index.ts
│   ├── renderer/         # React 前端
│   │   ├── components/
│   │   │   ├── Board/
│   │   │   ├── ControlPanel/
│   │   │   ├── Settings/
│   │   │   ├── SGF/
│   │   │   └── Statistics/
│   │   ├── stores/
│   │   │   ├── game-store.ts
│   │   │   ├── settings-store.ts
│   │   │   └── ui-store.ts
│   │   └── main.tsx
│   └── shared/            # 共享类型
│       ├── constants.ts
│       └── types.ts
├── engines/              # AI 引擎文件
│   ├── katago/
│   └── pachi/
├── docs/                  # 文档
│   ├── guide/            # 公开文档（用户指南、集成指南）
│   ├── design/           # 内部文档（架构和设计规格）
│   └── dev/              # 内部文档（开发计划和任务）
└── debug/                # 调试日志
```

## 🛠️ 技术栈

### 前端

- **React 18**: UI 框架
- **TypeScript**: 类型安全
- **Zustand**: 状态管理
- **Ant Design**: UI 组件库
- **Vite**: 构建工具

### 桌面框架

- **Electron 28**: 跨平台桌面应用
- **IPC**: 主进程与渲染进程通信

### AI 通信

- **GTP (Go Text Protocol)**: 标准围棋引擎协议
- **子进程管理**: 引擎进程控制

## 📊 项目状态

当前版本: **v1.0.0**

完成度: **约 92%**

### ✅ 已完成

- [x] 项目基础设施
- [x] 核心类型定义
- [x] 游戏控制器
- [x] 棋盘逻辑和规则验证
- [x] GTP 引擎封装
- [x] Mock 引擎实现
- [x] Pachi 引擎集成
- [x] KataGo 引擎集成
- [x] React UI 组件
- [x] 状态管理
- [x] IPC 通信层
- [x] AI 引擎选择界面
- [x] 强度调节功能
- [x] 终局判定与计分（基于 KataGo `final_score`）
- [x] SGF 棋谱导出
- [x] 实时胜率曲线
- [x] 小棋盘适配（9×9、13×13）

### 📋 计划中

- [ ] 多语言支持
- [ ] 主题切换
- [ ] 棋谱分析功能
- [ ] 引擎对比模式
- [ ] 批量对弈功能
- [ ] 更多引擎集成（Leela Zero）


## 🧪 测试

```bash
# 运行单元测试
npm test

# 类型检查
npm run type-check

# 代码检查
npm run lint
```

## 📝 开发指南

### 添加新的 AI 引擎

1. 在 [`src/shared/types.ts`](src/shared/types.ts:28) 添加引擎类型
2. 在 [`src/main/gtp/`](src/main/gtp/) 创建引擎适配器
3. 在 [`src/main/game-controller.ts`](src/main/game-controller.ts:179) 添加引擎参数配置
4. 在 [`src/main/settings-manager.ts`](src/main/settings-manager.ts:64) 配置默认路径
5. 在前端 [`AISettings.tsx`](src/renderer/components/ControlPanel/AISettings.tsx:1) 添加选项

详细说明请查看 [Pachi 集成文档](docs/guide/PACHI_INTEGRATION.md)

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 组件使用函数式写法
- 状态管理使用 Zustand
- 样式使用 CSS Modules

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献流程

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Pachi](https://github.com/pasky/pachi) - 优秀的开源围棋引擎
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [React](https://reactjs.org/) - UI 框架
- [Ant Design](https://ant.design/) - UI 组件库

## 📧 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件至: 2971755027@qq.com

## 🔗 相关链接

- [用户指南](docs/guide/USER_GUIDE.md)
- [KataGo 集成文档](docs/guide/KATAGO_INTEGRATION.md)
- [Pachi 集成文档](docs/guide/PACHI_INTEGRATION.md)
- [Pachi 故障排除](docs/guide/PACHI_TROUBLESHOOTING.md)

---

**享受围棋 AI 对弈的乐趣！** 🎮♟️
