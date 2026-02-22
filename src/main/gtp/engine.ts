/**
 * GTP引擎基类
 * 通过GTP协议与真实AI引擎通信
 */

import { spawn, ChildProcess } from 'child_process';
import { BoardSize, EngineType, GTPEngineOptions } from '../../shared/types';
import { MockEngine } from './mock-engine';
import { getGameLogger } from '../utils/game-logger';

/**
 * GTP命令响应
 */
interface GTPResponse {
  success: boolean;
  data: string;
  error?: string;
}

/**
 * GTP引擎类
 */
/**
 * 分析数据（胜率 + 领先目数）
 */
export interface AnalyzeData {
  winrate: number;     // 0~1，黑棋胜率
  scorelead: number;   // 正数=黑棋领先，负数=白棋领先
}

export class GTPEngine {
  private process: ChildProcess | null = null;
  private mockEngine: MockEngine | null = null;
  private options: GTPEngineOptions;
  private isReady: boolean = false;
  private isMockMode: boolean = false;
  private commandQueue: Array<{
    command: string;
    resolve: (value: GTPResponse) => void;
    reject: (reason: any) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  private responseBuffer: string = '';
  private currentCommandId: number = 0;

  // stderr 流缓冲区（解决 chunk 截断问题）
  private stderrBuffer: string = '';
  // KataGo 最近一次解析到的胜率（当前思考方视角，0~1）
  public lastParsedWinrate: number = 0.5;

  constructor(options: GTPEngineOptions) {
    this.options = {
      commandTimeout: 30000,
      startupTimeout: 20000, // 增加到 20 秒
      logCommands: false,
      logResponses: false,
      mockStrength: 5,
      mockDelay: 500,
      ...options,
    };

    // 检查是否使用Mock模式
    this.isMockMode =
      this.options.engineType === 'mock' || this.options.enginePath === 'mock';
  }

  /**
   * 启动引擎
   */
  async start(enginePath: string, boardSize: BoardSize): Promise<void> {
    if (this.isMockMode) {
      return this.startMockEngine(boardSize);
    }

    return this.startRealEngine(enginePath, boardSize);
  }

  /**
   * 启动Mock引擎
   */
  private async startMockEngine(boardSize: BoardSize): Promise<void> {
    this.log('启动Mock引擎');
    this.mockEngine = new MockEngine({
      strength: this.options.mockStrength,
      delay: this.options.mockDelay,
      boardSize,
      verbose: this.options.logCommands,
    });

    await this.mockEngine.start();
    this.isReady = true;
  }

  /**
   * 启动真实引擎
   */
  private async startRealEngine(enginePath: string, boardSize: BoardSize): Promise<void> {
    this.log(`启动引擎: ${enginePath}`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('引擎启动超时'));
      }, this.options.startupTimeout);

      try {
        // 启动子进程
        const args = this.options.args || ['--mode', 'gtp'];
        this.process = spawn(enginePath, args);

        // 设置输出编码
        this.process.stdout?.setEncoding('utf8');
        this.process.stderr?.setEncoding('utf8');

        // 监听输出
        this.process.stdout?.on('data', (data: string) => {
          this.handleOutput(data);
        });

        // 监听错误输出（含 KataGo 分析数据解析）
        this.process.stderr?.on('data', (data: string) => {
          this.handleStderr(data);
        });

        // 监听进程退出
        this.process.on('exit', (code, signal) => {
          this.log(`引擎进程退出: code=${code}, signal=${signal}`);
          this.isReady = false;
          this.process = null;
        });

        // 监听进程错误
        this.process.on('error', (error) => {
          this.logError(`引擎进程错误: ${error.message}`);
          clearTimeout(timeout);
          reject(error);
        });

        // 标记为就绪，以便发送初始化命令
        this.isReady = true;

        // 立即尝试发送初始化命令，利用 sendCommand 的队列和超时机制处理启动过程
        // 这样比硬编码的 setTimeout(1500) 更可靠
        (async () => {
          try {
            await this.sendCommand('name');
            await this.sendCommand('version');
            await this.setBoardSize(boardSize);

            clearTimeout(timeout);
            resolve();
          } catch (error) {
            this.isReady = false;
            clearTimeout(timeout);
            reject(error);
          }
        })();
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * 处理引擎输出
   * 在正常 GTP 解析之前，先扫描 stdout 中的 kata-analyze 输出行提取 winrate
   */
  private handleOutput(data: string): void {
    const logger = getGameLogger();
    const engineId = this.options.engineType;
    this.responseBuffer += data;

    logger.gtpStdoutChunk(engineId, data);

    // 先从 responseBuffer 中提取并移除 kata-analyze 的 info move 行
    // 这些行不属于 GTP 响应，需要在 GTP 解析之前剥离
    this.extractAnalyzeLines();

    logger.gtpExtractResult(engineId, JSON.stringify(this.responseBuffer).substring(0, 120), this.lastParsedWinrate);

    // GTP 协议规定响应以两个换行符结束。
    // 在 Windows 上可能是 \r\n\r\n，在 Unix 上是 \n\n。
    // 我们使用正则表达式来兼容处理。
    const terminatorRegex = /\n\s*\n/;
    let match: RegExpExecArray | null;

    while ((match = terminatorRegex.exec(this.responseBuffer)) !== null) {
      const terminatorIndex = match.index;
      const terminatorLength = match[0].length;

      // 提取一个完整的响应块
      const rawResponse = this.responseBuffer.substring(0, terminatorIndex).trim();
      // 更新缓冲区，移除已处理的部分
      this.responseBuffer = this.responseBuffer.substring(terminatorIndex + terminatorLength);

      if (this.commandQueue.length > 0) {
        const pending = this.commandQueue.shift()!;
        clearTimeout(pending.timeout);

        // 解析提取出的完整响应
        const response = this.parseResponse(rawResponse);
        this.logResponse(response.data);

        logger.gtpResponse(engineId, rawResponse, response.data, pending.command);

        pending.resolve(response);
      }
    }
  }

  /**
   * 从 responseBuffer 中提取 kata-genmove_analyze / kata-analyze 的输出行
   *
   * kata-genmove_analyze 输出格式：
   *   =\n
   *   info move D3 visits 30 ... winrate 0.819727 ...\n
   *   info move E3 visits 10 ... winrate 0.807100 ...\n
   *   ...
   *   play D3\n\n
   *
   * 需要：
   * 1. 剥离 info move 行，解析 winrate（支持科学计数法如 8.18e-05）
   * 2. 将 "play D3" 转换为 "= D3" 以便 GTP 解析器正常工作
   */
  private extractAnalyzeLines(): void {
    const lines = this.responseBuffer.split('\n');
    const cleanLines: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // 剥离 info move 行（可能包含多个 info move 段落在同一行）
      if (trimmed.includes('info move')) {
        // 解析 winrate，支持科学计数法（如 8.18344e-05）
        const wrMatch = trimmed.match(/winrate\s+([0-9.eE+-]+)/);
        if (wrMatch && wrMatch[1]) {
          this.lastParsedWinrate = parseFloat(wrMatch[1]);
        }
        // 不放回 buffer（剥离）
        continue;
      }
      
      // 处理 "play D3"（kata-genmove_analyze 的着法输出格式）
      // kata-genmove_analyze 先输出 "=\n"，最后输出 "play D3\n\n"
      // 需要将之前的空 "=" 替换为 "= D3"，避免双重 "=" 行
      const playMatch = trimmed.match(/^play\s+(\S+)$/i);
      if (playMatch) {
        // 找到之前的空 "=" 行并替换（可能带命令 ID，如 "=9" 或 "= 9"）
        const eqIdx = cleanLines.findIndex(l => /^=\s*\d*\s*$/.test(l.trim()));
        if (eqIdx !== -1) {
          // 保留原始的 = 和命令 ID 前缀，追加着法
          const eqLine = cleanLines[eqIdx].trim();
          cleanLines[eqIdx] = `${eqLine} ${playMatch[1]}`;
        } else {
          cleanLines.push(`= ${playMatch[1]}`);
        }
        continue;
      }
      
      cleanLines.push(line);
    }
    
    this.responseBuffer = cleanLines.join('\n');
  }

  /**
   * 解析GTP响应
   */
  private parseResponse(response: string): GTPResponse {
    const lines = response.trim().split('\n');
    const firstLine = lines[0];

    // GTP响应格式: = [id] data 或 ? [id] error
    if (firstLine.startsWith('=')) {
      // 移除 '=' 和可选的命令ID
      let data = firstLine.substring(1).trim();
      
      // 如果第一个词是数字（命令ID），则移除它
      const parts = data.split(/\s+/);
      if (parts.length > 0 && /^\d+$/.test(parts[0])) {
        // 移除命令ID，保留实际数据
        data = parts.slice(1).join(' ');
      }
      
      return {
        success: true,
        data: data,
      };
    } else if (firstLine.startsWith('?')) {
      // 移除 '?' 和可选的命令ID
      let error = firstLine.substring(1).trim();
      
      // 如果第一个词是数字（命令ID），则移除它
      const parts = error.split(/\s+/);
      if (parts.length > 0 && /^\d+$/.test(parts[0])) {
        // 移除命令ID，保留实际错误信息
        error = parts.slice(1).join(' ');
      }
      
      return {
        success: false,
        data: '',
        error: error,
      };
    } else {
      // 无前缀，假设成功
      return {
        success: true,
        data: response.trim(),
      };
    }
  }

  /**
   * 发送GTP命令
   */
  async sendCommand(command: string): Promise<string> {
    if (this.isMockMode && this.mockEngine) {
      return this.sendMockCommand(command);
    }

    return this.sendRealCommand(command);
  }

  /**
   * 发送命令到Mock引擎
   */
  private async sendMockCommand(command: string): Promise<string> {
    this.logCommand(command);

    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case 'name':
        return this.mockEngine!.getName();

      case 'version':
        return this.mockEngine!.getVersion();

      case 'boardsize':
        if (parts.length > 1) {
          await this.mockEngine!.setBoardSize(parseInt(parts[1]) as BoardSize);
        }
        return '';

      case 'clear_board':
        await this.mockEngine!.clearBoard();
        return '';

      case 'komi':
        if (parts.length > 1) {
          await this.mockEngine!.setKomi(parseFloat(parts[1]));
        }
        return '';

      case 'play':
        if (parts.length >= 3) {
          const color = parts[1].toLowerCase() as 'black' | 'white';
          const move = parts[2];
          await this.mockEngine!.play(color, move);
        }
        return '';

      case 'genmove':
        if (parts.length > 1) {
          const color = parts[1].toLowerCase() as 'black' | 'white';
          return await this.mockEngine!.genmove(color);
        }
        return 'pass';

      case 'final_score':
        return await this.mockEngine!.finalScore();

      case 'quit':
        await this.mockEngine!.quit();
        return '';

      default:
        return '';
    }
  }

  /**
   * 发送命令到真实引擎
   */
  private async sendRealCommand(command: string): Promise<string> {
    if (!this.process || !this.isReady) {
      throw new Error('引擎未就绪');
    }

    this.logCommand(command);
    getGameLogger().gtpCommand(this.options.engineType, command);

    return new Promise((resolve, reject) => {
      const commandId = ++this.currentCommandId;
      const fullCommand = `${commandId} ${command}\n`;

      // 设置超时
      const timeout = setTimeout(() => {
        const index = this.commandQueue.findIndex((item) => item.command === command);
        if (index !== -1) {
          this.commandQueue.splice(index, 1);
        }
        reject(new Error(`命令超时: ${command}`));
      }, this.options.commandTimeout);

      // 添加到队列
      this.commandQueue.push({
        command,
        resolve: (response: GTPResponse) => {
          if (response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response.error || '命令失败'));
          }
        },
        reject,
        timeout,
      });

      // 发送命令
      this.process!.stdin?.write(fullCommand);
    });
  }

  /**
   * 生成着法
   * 对于 KataGo：使用 kata-genmove_analyze 同时获取着法和胜率（零额外开销）
   * 对于 Mock/其他引擎：使用标准 genmove
   */
  async genmove(color: 'black' | 'white'): Promise<string> {
    if (!this.isMockMode && this.options.engineType === 'katago') {
      // kata-genmove_analyze [color] [interval]
      // interval=100 表示每 100ms 报告一次分析（我们只关心最终结果）
      const response = await this.sendCommand(`kata-genmove_analyze ${color === 'black' ? 'b' : 'w'} 100`);
      // extractAnalyzeLines 已将 "play D3" 转换为 "D3"
      return response.trim().toLowerCase();
    }
    const response = await this.sendCommand(`genmove ${color}`);
    return response.trim().toLowerCase();
  }

  /**
   * 在棋盘上落子
   */
  async play(color: 'black' | 'white', move: string): Promise<void> {
    await this.sendCommand(`play ${color} ${move}`);
  }

  /**
   * 设置棋盘大小
   */
  async setBoardSize(size: BoardSize): Promise<void> {
    await this.sendCommand(`boardsize ${size}`);
  }

  /**
   * 设置贴目
   */
  async setKomi(komi: number): Promise<void> {
    await this.sendCommand(`komi ${komi}`);
  }

  /**
   * 设置棋力（如果引擎支持）
   */
  async setLevel(level: number): Promise<void> {
    try {
      if (this.isMockMode && this.mockEngine) {
        await this.mockEngine.setLevel(level);
      } else {
        // GNU Go使用level命令
        await this.sendCommand(`level ${level}`);
      }
    } catch (error) {
      // 某些引擎可能不支持level命令
      this.log(`设置棋力失败（引擎可能不支持）: ${error}`);
    }
  }

  /**
   * 清空棋盘
   */
  async clearBoard(): Promise<void> {
    await this.sendCommand('clear_board');
  }

  /**
   * 获取终盘得分
   */
  async finalScore(): Promise<string> {
    return await this.sendCommand('final_score');
  }


  /**
   * 处理 stderr 输出，使用缓冲区正确拼接 chunk 后按行解析
   *
   * KataGo stderr 搜索信息格式（根行）：
   *   : T  12.42c W  12.65c S  -0.09c ( +0.5 L  +0.4) N  502  --  Q16 D4 ...
   * 其中 W 是 winrate centipawn（已按 reportAnalysisWinratesAs=BLACK 统一为黑方视角）
   * 转换公式：realWinrate = (W_centipawn / 100 + 1) / 2
   */
  private handleStderr(data: string): void {
    this.stderrBuffer += data;
    let newlineIndex: number;
    while ((newlineIndex = this.stderrBuffer.indexOf('\n')) !== -1) {
      const line = this.stderrBuffer.slice(0, newlineIndex).trim();
      this.stderrBuffer = this.stderrBuffer.slice(newlineIndex + 1);

      if (!line) continue;

      // 匹配 KataGo 搜索信息根行：": T  XXc W  XXc S  XXc ..."
      // 根行以 ": T" 开头（冒号后跟空格和 T）
      const rootMatch = line.match(/^:\s+T\s+(-?[\d.]+)c\s+W\s+(-?[\d.]+)c/);
      if (rootMatch && rootMatch[2]) {
        const wCentipawn = parseFloat(rootMatch[2]);
        // 转换 centipawn 为 0~1 胜率
        this.lastParsedWinrate = (wCentipawn / 100 + 1) / 2;
        // 限制在 [0, 1] 范围内
        this.lastParsedWinrate = Math.max(0, Math.min(1, this.lastParsedWinrate));
        continue;
      }

      // 跳过其他搜索信息行（着法行、棋盘显示等）
      // 着法行格式: "Q16 : T  12.91c W  13.12c ..."
      // 棋盘行、PV行、Tree行等
      if (line.match(/^[A-T]\d+\s*:/) || line.match(/^---/) || line.match(/^PV:/) || line.match(/^Tree:/) ||
          line.match(/^\d+\s/) || line.match(/^Root visits/) || line.match(/^New playouts/) ||
          line.match(/^NN /) || line.match(/^Time taken/) || line.match(/^MoveNum/) ||
          line.match(/^ko/) || line.match(/^\s+[A-T]\s/) || line.match(/^\s+\d+\s+[.X@O]/)) {
        // 搜索信息行，静默跳过
        continue;
      }

      // 其他非搜索行记录日志（启动信息等）
      // 不用 logError 以免刷屏，只在 verbose 模式下记录
      if (this.options.logCommands) {
        this.log(`stderr: ${line}`);
      }
    }
  }

  /**
   * 停止引擎
   */
  async quit(): Promise<void> {
    try {
      if (this.isMockMode && this.mockEngine) {
        await this.mockEngine.quit();
      } else if (this.process) {
        await this.sendCommand('quit');
        this.process.kill();
      }
    } catch (error) {
      this.logError(`停止引擎失败: ${error}`);
    } finally {
      this.isReady = false;
      this.process = null;
      this.mockEngine = null;
    }
  }

  /**
   * 检查引擎是否就绪
   */
  isEngineReady(): boolean {
    return this.isReady;
  }

  /**
   * 获取引擎类型
   */
  getEngineType(): EngineType {
    return this.options.engineType;
  }

  /**
   * 日志输出
   */
  private log(message: string): void {
    if (this.options.logCommands) {
      console.log(`[GTPEngine] ${message}`);
    }
  }

  /**
   * 命令日志
   */
  private logCommand(command: string): void {
    if (this.options.logCommands) {
      console.log(`[GTPEngine] >>> ${command}`);
    }
  }

  /**
   * 响应日志
   */
  private logResponse(response: string): void {
    if (this.options.logResponses) {
      console.log(`[GTPEngine] <<< ${response}`);
    }
  }

  /**
   * 错误日志
   */
  private logError(message: string): void {
    console.error(`[GTPEngine] ERROR: ${message}`);
  }
}
