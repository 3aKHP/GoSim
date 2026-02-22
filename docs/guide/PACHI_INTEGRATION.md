# Pachi 引擎集成指南

## 概述

Pachi 是一个强大的开源围棋引擎，基于蒙特卡洛树搜索（MCTS）算法。本项目已成功集成 Pachi 引擎，支持通过 GTP 协议进行 AI 对弈。

## 文件结构

```
GoSim/
├── engines/
│   └── pachi/
│       ├── pachi.exe          # Pachi 引擎可执行文件
│       ├── opening.dat         # 开局库
│       ├── patterns_mm.gamma   # 模式匹配数据
│       └── patterns_mm.spat    # 空间模式数据
├── src/
│   ├── shared/
│   │   └── types.ts           # 添加了 'pachi' 引擎类型
│   ├── main/
│   │   ├── game-controller.ts # 更新了 Pachi 参数配置
│   │   ├── settings-manager.ts # 添加了 Pachi 默认路径
│   │   └── gtp/
│   │       ├── engine.ts      # GTP 引擎基类
│   │       └── pachi-engine.ts # Pachi 引擎适配器
```

## 核心实现

### 1. 类型定义更新

在 [`src/shared/types.ts`](../../src/shared/types.ts:28) 中添加了 `'pachi'` 引擎类型：

```typescript
export type EngineType = 'gnugo' | 'katago' | 'leela' | 'pachi' | 'mock' | 'custom';
```

### 2. Pachi 引擎适配器

创建了 [`src/main/gtp/pachi-engine.ts`](../../src/main/gtp/pachi-engine.ts:1)，提供了：

- **强度映射**: 将 1-10 的强度值映射到 Pachi 的 playouts 参数
- **参数配置**: 自动配置线程数、最大思考时间等参数
- **路径管理**: 支持开发和生产环境的路径自动切换

#### 强度映射表

| 强度 | Playouts | 线程数 | 最大时间(秒) | 描述 |
|------|----------|--------|--------------|------|
| 1    | 1,000    | 1      | 10           | 快速模式 |
| 2    | 3,000    | 1      | 10           | 快速模式 |
| 3    | 5,000    | 1      | 10           | 快速模式 |
| 4    | 10,000   | 2      | 15           | 中等模式 |
| 5    | 20,000   | 2      | 15           | 中等模式 |
| 6    | 50,000   | 2      | 15           | 中等模式 |
| 7    | 100,000  | 4      | 30           | 强力模式 |
| 8    | 200,000  | 4      | 30           | 强力模式 |
| 9    | 500,000  | 4      | 30           | 强力模式 |
| 10   | 1,000,000| 4      | 30           | 最强模式 |

### 3. 游戏控制器更新

在 [`src/main/game-controller.ts`](../../src/main/game-controller.ts:179) 中添加了 Pachi 引擎参数配置：

```typescript
case 'pachi':
  // Pachi 引擎参数
  const playouts = this.strengthToPlayouts(profile.strength);
  
  if (playouts > 0) {
    args.push('max_playouts=' + playouts);
  }
  
  // 设置线程数（根据强度调整）
  const threads = profile.strength >= 7 ? 4 : profile.strength >= 4 ? 2 : 1;
  args.push('threads=' + threads);
  
  // 设置最大思考时间
  const maxTime = profile.strength >= 7 ? 30 : profile.strength >= 4 ? 15 : 10;
  args.push('max_time=' + maxTime);
  break;
```

### 4. 设置管理器更新

在 [`src/main/settings-manager.ts`](../../src/main/settings-manager.ts:64) 中添加了 Pachi 默认路径：

```typescript
enginePaths: {
  gnugo: '',
  katago: '',
  leela: '',
  pachi: 'engines/pachi/pachi.exe',
  mock: 'mock',
  custom: '',
}
```

## 使用方法

### 1. 创建 Pachi AI 配置

```typescript
const pachiAI: AIProfile = {
  id: 'pachi-1',
  name: 'Pachi 引擎',
  engineType: 'pachi',
  strength: 5,  // 1-10，推荐 5
  enginePath: 'engines/pachi/pachi.exe',
  timeSettings: {
    mainTime: 300,
    byoYomi: 30,
    byoYomiPeriods: 3,
  },
  description: 'Pachi 开源围棋引擎',
  available: true,
};
```

### 2. 启动游戏

```typescript
// 在渲染进程中
await window.electronAPI.startGame(
  19,           // 棋盘大小
  pachiAI,      // 黑棋 AI
  pachiAI,      // 白棋 AI
  6.5,          // 贴目
  0             // 让子
);
```

### 3. 使用 PachiEngine 类（高级用法）

```typescript
import { PachiEngine } from './gtp/pachi-engine';

// 创建 Pachi 引擎实例
const engine = new PachiEngine({
  strength: 5,
  threads: 2,
  maxTime: 15,
  logCommands: true,
});

// 启动引擎
await engine.startEngine(19);

// 获取引擎信息
const info = await engine.getEngineInfo();
console.log(info);
// { name: 'Pachi', version: '12.80', author: 'Petr Baudis and Jean-loup Gailly' }

// 生成着法
const move = await engine.genmove('black');
console.log(move); // 例如: "Q16"

// 关闭引擎
await engine.quit();
```

## Pachi 引擎特性

### 优势

1. **开源免费**: 完全开源，无需许可证
2. **快速响应**: 基于 MCTS，可以快速生成着法
3. **可调节强度**: 通过 playouts 参数灵活调节棋力
4. **多线程支持**: 支持多核 CPU 并行计算
5. **开局库**: 内置开局库，提高开局质量

### 局限性

1. **棋力上限**: 相比 KataGo 等神经网络引擎，棋力较弱
2. **资源消耗**: 高强度模式下需要较多 CPU 资源
3. **Windows 限制**: 当前只提供了 Windows 版本

## 性能建议

### 开发测试

- **强度**: 3-5
- **Playouts**: 5,000 - 20,000
- **线程数**: 1-2
- **思考时间**: 10-15 秒

### 正常对弈

- **强度**: 5-7
- **Playouts**: 20,000 - 100,000
- **线程数**: 2-4
- **思考时间**: 15-30 秒

### 高质量对弈

- **强度**: 8-10
- **Playouts**: 200,000 - 1,000,000
- **线程数**: 4+
- **思考时间**: 30+ 秒

## 故障排除

### 引擎启动失败

**问题**: 引擎无法启动或超时

**解决方案**:
1. 检查 `engines/pachi/pachi.exe` 是否存在
2. 确认文件路径正确（相对于项目根目录）
3. 检查是否有杀毒软件阻止执行
4. 查看控制台日志获取详细错误信息

### 着法生成缓慢

**问题**: AI 思考时间过长

**解决方案**:
1. 降低强度设置（减少 playouts）
2. 减少线程数（避免 CPU 过载）
3. 减少最大思考时间限制
4. 使用 Mock 引擎进行快速测试

### GTP 通信错误

**问题**: 引擎响应异常或命令失败

**解决方案**:
1. 启用命令日志: `logCommands: true`
2. 检查 GTP 命令格式是否正确
3. 确认引擎版本兼容性
4. 查看引擎的 stderr 输出

## 扩展开发

### 添加自定义参数

可以在 [`PachiEngine`](../../src/main/gtp/pachi-engine.ts:1) 类中添加更多 Pachi 特定参数：

```typescript
// 设置 UCT 参数
await engine.setPachiParameter('uct_prior', '0.5');

// 设置动态 komi
await engine.setPachiParameter('dynkomi', 'linear');
```

### 支持其他平台

要支持 macOS 或 Linux，需要：

1. 下载对应平台的 Pachi 二进制文件
2. 更新 [`getDefaultPath()`](../../src/main/gtp/pachi-engine.ts:58) 方法
3. 根据平台选择正确的可执行文件

```typescript
static getDefaultPath(): string {
  const platform = process.platform;
  const exeName = platform === 'win32' ? 'pachi.exe' : 'pachi';
  
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), 'engines', 'pachi', exeName);
  }
  
  const resourcesPath = process.resourcesPath || app.getAppPath();
  return path.join(resourcesPath, 'engines', 'pachi', exeName);
}
```

## 参考资源

- [Pachi 官方网站](http://pachi.or.cz/)
- [Pachi GitHub 仓库](https://github.com/pasky/pachi)
- [GTP 协议规范](https://www.lysator.liu.se/~gunnar/gtp/gtp2-spec-draft2/gtp2-spec.html)
- [围棋引擎对比](https://senseis.xmp.net/?ComputerGoEngines)

## 更新日志

### 2026-02-13
- ✅ 添加 Pachi 引擎类型定义
- ✅ 创建 PachiEngine 适配器类
- ✅ 更新游戏控制器支持 Pachi 参数
- ✅ 配置默认引擎路径
- ✅ 实现强度到 playouts 的映射
- ✅ 添加多线程和时间控制支持

## 下一步计划

- [ ] 添加 Pachi 引擎配置 UI
- [ ] 支持自定义 Pachi 参数
- [ ] 添加引擎性能监控
- [ ] 实现引擎热切换功能
- [ ] 支持多个 Pachi 实例同时运行
