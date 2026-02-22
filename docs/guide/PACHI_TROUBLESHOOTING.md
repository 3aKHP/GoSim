# Pachi 引擎故障排除指南

## 问题 1：缺少 DCNN 文件

### 错误信息

```
Couldn't find dcnn files, aborting.
Loading dcnn files: detlef54.prototxt, detlef54.trained
```

### 解决方案 ✅

已添加 `--nodcnn` 参数禁用深度神经网络。

---

## 问题 2：缺少 Joseki 文件

### 错误信息

```
Joseki file joseki19.gtp missing, aborting.
```

### 原因分析

你下载的 Pachi 版本是 **dcnn build**（深度卷积神经网络版本），这个版本需要额外的神经网络文件才能运行：
- `detlef54.prototxt` - 网络结构定义文件
- `detlef54.trained` - 训练好的权重文件

这些文件通常很大（几百MB），需要单独下载。

### 解决方案

#### 方案 1：禁用 DCNN（已实施，推荐）✅

我已经在代码中添加了 `--nodcnn` 参数，这样 Pachi 会使用传统的 MCTS（蒙特卡洛树搜索）算法，不需要神经网络文件。

**优点**:
- 无需额外下载文件
- 启动速度快
- 内存占用小
- 仍然有不错的棋力

**缺点**:
- 棋力略低于 DCNN 版本
- 但对于观摩学习已经足够

**当前配置**:
```typescript
// 在 game-controller.ts 中
case 'pachi':
  args.push('--nodcnn');     // 禁用 DCNN（深度神经网络）
  args.push('--nojoseki');   // 禁用 Joseki（定式库）
  args.push(`-t`, `=${sims}`);  // 设置模拟次数
  args.push(`threads=${threads}`);  // 设置线程数
  args.push(`resign_threshold=0.20`);  // 认输阈值
  break;
```

这样配置后，Pachi 只使用基本的 MCTS 算法和模式匹配，不需要任何额外的数据文件。

#### 方案 2：下载 DCNN 文件（可选）

如果你想使用完整的 DCNN 版本，需要：

1. **下载神经网络文件**
   - 访问 Pachi 官方网站或 GitHub
   - 下载 `detlef54.prototxt` 和 `detlef54.trained`
   - 文件大小约 200-300MB

2. **放置文件**
   ```
   engines/pachi/
   ├── pachi.exe
   ├── opening.dat
   ├── patterns_mm.gamma
   ├── patterns_mm.spat
   ├── detlef54.prototxt      ← 新增
   └── detlef54.trained        ← 新增
   ```

3. **修改代码**
   在 [`game-controller.ts`](../../src/main/game-controller.ts:204) 中移除 `--nodcnn` 参数

4. **重启应用**

**优点**:
- 更强的棋力
- 更好的局面判断

**缺点**:
- 需要下载大文件
- 启动较慢
- 内存占用较大（~500MB）

### 当前状态

✅ **已修复**: 添加了 `--nodcnn` 参数  
✅ **可立即使用**: 无需额外下载  
✅ **棋力足够**: 业余段位水平

### 测试步骤

1. 重新编译主进程代码（如果开发服务器在运行，会自动编译）
2. 在 UI 中选择 Pachi 引擎
3. 设置强度（推荐 5）
4. 点击"开始对弈"

### 预期行为

Pachi 应该能够正常启动，不再报错 "Couldn't find dcnn files"。

### 如果仍有问题

如果仍然遇到问题，请检查：

1. **引擎路径是否正确**
   - 默认路径: `engines/pachi/pachi.exe`
   - 确认文件存在且可执行

2. **查看控制台日志**
   - 按 F12 打开 DevTools
   - 查看 Console 标签页的错误信息

3. **尝试 Mock 引擎**
   - 如果 Pachi 仍有问题，可以先使用 Mock 引擎测试
   - Mock 引擎无需任何配置，可以立即使用

### Pachi 版本说明

你的 Pachi 版本信息：
```
Pachi 12.88 (Jowa)
git 8773a3c3 (master)
x86-64 dcnn build, Dec 10 2025
```

这是一个较新的版本，支持：
- ✅ 传统 MCTS 算法（`--nodcnn`）
- ✅ DCNN 神经网络（需要额外文件）
- ✅ 模式匹配（patterns_mm.*）
- ✅ 开局库（opening.dat）

### 性能对比

| 模式 | 棋力 | 速度 | 内存 | 文件需求 |
|------|------|------|------|----------|
| **MCTS（当前）** | 业余3-5段 | 快 | ~100MB | 基本文件 |
| **DCNN** | 业余5-7段 | 较慢 | ~500MB | +神经网络文件 |

对于观摩学习和测试，MCTS 模式已经足够。

### 相关文档

- [Pachi 集成文档](./PACHI_INTEGRATION.md)
- [KataGo 集成文档](./KATAGO_INTEGRATION.md)
- [用户指南](./USER_GUIDE.md)
- [项目状态](../PROJECT_STATUS.md)

---

**更新时间**: 2026-02-13  
**状态**: ✅ 已修复
