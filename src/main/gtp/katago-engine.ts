/**
 * KataGo 引擎适配器
 * KataGo 是目前最强的开源围棋引擎，支持 GTP 协议
 */

import { GTPEngine } from './engine';
import { GTPEngineOptions, BoardSize } from '../../shared/types';
import path from 'path';
import { app } from 'electron';

/**
 * KataGo 引擎配置选项
 */
export interface KataGoEngineOptions extends Partial<GTPEngineOptions> {
  modelPath: string;   // 权重文件路径 (.bin.gz)
  configPath: string;  // GTP 配置文件路径 (.cfg)
  strength?: number;   // 1-10
  threads?: number;    // 线程数
  maxVisits?: number;  // 每步最大访问次数
}

/**
 * KataGo 引擎类
 */
export class KataGoEngine extends GTPEngine {
  private katagoOptions: KataGoEngineOptions;

  constructor(options: KataGoEngineOptions) {
    const { modelPath, configPath } = options;

    if (!modelPath) {
      throw new Error('KataGo 需要指定模型文件路径 (modelPath)');
    }
    if (!configPath) {
      throw new Error('KataGo 需要指定配置文件路径 (configPath)');
    }

    // 构建 KataGo 启动参数
    const args = [
      'gtp',
      '-model', modelPath,
      '-config', configPath,
    ];

    super({
      engineType: 'katago',
      enginePath: options.enginePath || KataGoEngine.getDefaultPath(),
      args,
      modelPath,
      configPath,
      commandTimeout: 120000, // KataGo 可能需要较长的思考时间
      startupTimeout: 30000,  // KataGo 启动加载模型需要更长时间
      logCommands: options.logCommands || false,
      logResponses: options.logResponses || false,
    });

    this.katagoOptions = options;
  }

  /**
   * 获取 KataGo 默认路径
   */
  static getDefaultPath(): string {
    // 在开发模式下，使用项目根目录的 engines/katago
    if (process.env.NODE_ENV === 'development') {
      return path.join(process.cwd(), 'engines', 'katago', 'katago.exe');
    }

    // 在生产模式下，使用打包后的资源目录
    const resourcesPath = process.resourcesPath || app.getAppPath();
    return path.join(resourcesPath, 'engines', 'katago', 'katago.exe');
  }

  /**
   * 启动 KataGo 引擎
   */
  async startEngine(boardSize: BoardSize = 19): Promise<void> {
    const enginePath = this.katagoOptions.enginePath || KataGoEngine.getDefaultPath();
    await super.start(enginePath, boardSize);
  }

  /**
   * 获取 KataGo 版本信息
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
   * 获取 KataGo 引擎信息
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
        name: name || 'KataGo',
        version: version || 'Unknown',
        author: 'David J Wu (lightvector)',
      };
    } catch (error) {
      return {
        name: 'KataGo',
        version: 'Unknown',
        author: 'David J Wu (lightvector)',
      };
    }
  }

  /**
   * 请求 KataGo 分析当前局面
   * KataGo 扩展命令，返回胜率、目差等信息
   */
  async kataAnalyze(maxVisits?: number): Promise<string> {
    const visits = maxVisits || this.katagoOptions.maxVisits || 100;
    try {
      return await this.sendCommand(`kata-analyze ${visits}`);
    } catch (error) {
      console.warn('KataGo kata-analyze 命令失败:', error);
      return '';
    }
  }
}
