/**
 * Pachi 引擎适配器
 * Pachi 是一个强大的开源围棋引擎，支持 GTP 协议
 */

import { GTPEngine } from './engine';
import { GTPEngineOptions, BoardSize } from '../../shared/types';
import path from 'path';
import { app } from 'electron';

/**
 * Pachi 引擎配置选项
 */
export interface PachiEngineOptions extends Partial<GTPEngineOptions> {
  strength?: number; // 1-10，对应 Pachi 的 playouts
  threads?: number; // 线程数
  maxTime?: number; // 每步最大思考时间（秒）
}

/**
 * Pachi 引擎类
 */
export class PachiEngine extends GTPEngine {
  private pachiOptions: PachiEngineOptions;

  constructor(options: PachiEngineOptions = {}) {
    // 将 strength 映射到 playouts
    const strength = options.strength || 5;
    const playouts = PachiEngine.strengthToPlayouts(strength);

    // 构建 Pachi 启动参数
    const args = [
      '--mode', 'gtp',
      '--threads', String(options.threads || 1),
      '--max-time', String(options.maxTime || 10),
    ];

    // 如果指定了 playouts，添加到参数中
    if (playouts > 0) {
      args.push('--playouts', String(playouts));
    }

    super({
      engineType: 'pachi',
      enginePath: options.enginePath || PachiEngine.getDefaultPath(),
      args,
      commandTimeout: 60000, // Pachi 可能需要更长的思考时间
      startupTimeout: 15000,
      logCommands: options.logCommands || false,
      logResponses: options.logResponses || false,
    });

    this.pachiOptions = options;
  }

  /**
   * 获取 Pachi 默认路径
   */
  static getDefaultPath(): string {
    // 在开发模式下，使用项目根目录的 engines/pachi
    if (process.env.NODE_ENV === 'development') {
      return path.join(process.cwd(), 'engines', 'pachi', 'pachi.exe');
    }

    // 在生产模式下，使用打包后的资源目录
    const resourcesPath = process.resourcesPath || app.getAppPath();
    return path.join(resourcesPath, 'engines', 'pachi', 'pachi.exe');
  }

  /**
   * 将强度（1-10）映射到 Pachi 的 playouts
   * 
   * Pachi 的 playouts 参数控制每步的模拟次数：
   * - 强度 1-3: 快速模式，1000-5000 playouts
   * - 强度 4-6: 中等模式，10000-50000 playouts
   * - 强度 7-9: 强力模式，100000-500000 playouts
   * - 强度 10: 最强模式，1000000 playouts
   */
  static strengthToPlayouts(strength: number): number {
    const clampedStrength = Math.max(1, Math.min(10, strength));

    const playoutsMap: Record<number, number> = {
      1: 1000,
      2: 3000,
      3: 5000,
      4: 10000,
      5: 20000,
      6: 50000,
      7: 100000,
      8: 200000,
      9: 500000,
      10: 1000000,
    };

    return playoutsMap[clampedStrength];
  }

  /**
   * 启动 Pachi 引擎
   */
  async startEngine(boardSize: BoardSize = 19): Promise<void> {
    const enginePath = this.pachiOptions.enginePath || PachiEngine.getDefaultPath();
    await super.start(enginePath, boardSize);
  }

  /**
   * 设置 Pachi 特定参数
   */
  async setPachiParameter(param: string, value: string): Promise<void> {
    try {
      await this.sendCommand(`pachi-set ${param} ${value}`);
    } catch (error) {
      console.warn(`设置 Pachi 参数失败: ${param}=${value}`, error);
    }
  }

  /**
   * 获取 Pachi 版本信息
   */
  async getVersion(): Promise<string> {
    try {
      const response = await this.sendCommand('version');
      return response;
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * 获取 Pachi 引擎信息
   */
  async getEngineInfo(): Promise<{
    name: string;
    version: string;
    author: string;
  }> {
    try {
      const name = await this.sendCommand('name');
      const version = await this.getVersion();

      return {
        name: name || 'Pachi',
        version: version || 'Unknown',
        author: 'Petr Baudis and Jean-loup Gailly',
      };
    } catch (error) {
      return {
        name: 'Pachi',
        version: 'Unknown',
        author: 'Petr Baudis and Jean-loup Gailly',
      };
    }
  }
}
