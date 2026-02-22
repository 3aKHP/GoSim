# KataGo 集成指南

## 概述

GoSim 已集成 KataGo v1.16.4（OpenCL 版本），作为主要的围棋 AI 引擎。KataGo 提供了精确的终局判定和胜负计算能力，解决了 Pachi 在终盘时无法正确处理死活和收官的问题。

## 快速开始

### 1. 一键下载 KataGo

在项目根目录运行：

```bash
node scripts/download-katago.js
```

该脚本会自动：
- 下载 KataGo v1.16.4 OpenCL Windows x64 版本
- 下载 b18c384nbt 轻量级网络模型（约 60MB）
- 解压到 `engines/katago/` 目录
- 生成默认 GTP 配置文件 `katago.cfg`

### 2. 默认路径

下载完成后，以下路径已自动配置：

| 文件 | 路径 |
|------|------|
| 可执行文件 | `engines/katago/katago.exe` |
| 网络模型 | `engines/katago/model.bin.gz` |
| GTP 配置 | `engines/katago/katago.cfg` |

### 3. 在 GoSim 中使用

1. 启动 GoSim 应用
2. 进入 **设置 → 引擎设置**
3. 在 KataGo 区域确认三个路径已正确填写
4. 点击"测试引擎"验证连接
5. 在控制面板中选择 KataGo 作为黑棋或白棋的 AI 引擎

## 配置说明

### katago.cfg 关键参数

```cfg
# 搜索线程数（根据 CPU 核心数调整）
numSearchThreads = 4

# 每步最大访问次数（越大越强，但越慢）
maxVisits = 500

# 规则设置
rules = chinese
komi = 7.5
```

更多配置选项请参考 `engines/katago/default_gtp.cfg` 或 [KataGo 官方文档](https://github.com/lightvector/KataGo)。

### 更换网络模型

如需使用更强的网络模型：
1. 访问 https://katagotraining.org/ 下载最新模型
2. 将 `.bin.gz` 文件放入 `engines/katago/` 目录
3. 在 GoSim 设置中更新"网络模型文件"路径

## 终局判定机制

KataGo 引入后，终局判定逻辑已重构：

1. **连续双 pass 检测**：当两个 AI 连续 pass 时，游戏进入终局状态
2. **GTP final_score**：向引擎发送 `final_score` 命令获取精确的胜负结果
3. **结果解析**：支持 `W+45.5`、`B+3.5`、`B+Resign` 等标准 GTP 格式
4. **回退机制**：如果 `final_score` 命令失败，自动回退到本地计算

## 架构说明

### 文件结构

```
src/main/gtp/
├── engine.ts           # GTP 引擎基类
├── katago-engine.ts    # KataGo 引擎适配器（新增）
├── pachi-engine.ts     # Pachi 引擎适配器
└── mock-engine.ts      # Mock 引擎（开发测试用）
```

### KataGoEngine 类

- 继承自 `GTPEngine` 基类
- 启动参数：`['gtp', '-model', modelPath, '-config', configPath]`
- 启动超时：30 秒（加载模型需要时间）
- 命令超时：120 秒（复杂局面分析可能较慢）

### 类型定义变更

- `AIProfile` 新增 `modelPath?` 和 `configPath?` 可选字段
- `GTPEngineOptions` 新增 `modelPath?` 和 `configPath?` 可选字段
- `UserSettings` 新增 `katagoModelPath?` 和 `katagoConfigPath?` 可选字段

## 故障排除

### KataGo 启动失败

1. 确认 GPU 驱动已安装且支持 OpenCL
2. 检查 `engines/katago/katago.exe` 是否存在
3. 检查模型文件和配置文件路径是否正确
4. 查看 `engines/katago/logs/` 目录下的日志

### 性能优化

- 降低 `maxVisits` 值可加快每步速度
- 减少 `numSearchThreads` 可降低 CPU 占用
- 使用更小的网络模型（如 b6c96）可在低端硬件上运行
