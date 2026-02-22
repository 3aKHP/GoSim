/**
 * 路径管理器
 * 处理跨平台路径、用户数据目录、引擎路径等
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { EngineType } from '../../shared/types';

/**
 * 路径管理类
 */
export class PathManager {
  private userDataPath: string;
  private gamesPath: string;
  private settingsPath: string;
  private enginesPath: string;
  private logsPath: string;

  constructor() {
    // 获取用户数据目录（用于持久化存储游戏和设置）
    this.userDataPath = app.getPath('userData');

    // 定义子目录
    this.gamesPath = path.join(this.userDataPath, 'games');
    this.settingsPath = path.join(this.userDataPath, 'settings');
    this.logsPath = path.join(this.userDataPath, 'logs');

    // 引擎目录：如果是打包后的应用，资源在 resources/engines
    // 如果是开发模式，通常在项目根目录的 engines
    if (app.isPackaged) {
      this.enginesPath = path.join(process.resourcesPath, 'engines');
    } else {
      this.enginesPath = path.join(app.getAppPath(), 'engines');
    }

    // 确保可写目录存在
    this.ensureDirectories();
  }

  /**
   * 确保所有必要的目录存在
   */
  private ensureDirectories(): void {
    // 注意：enginesPath 在打包后是只读的，不应尝试创建
    const directories = [
      this.userDataPath,
      this.gamesPath,
      this.settingsPath,
      this.logsPath,
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * 获取用户数据目录
   */
  getUserDataPath(): string {
    return this.userDataPath;
  }

  /**
   * 获取游戏保存目录
   */
  getGamesPath(): string {
    return this.gamesPath;
  }

  /**
   * 获取设置文件路径
   */
  getSettingsFilePath(): string {
    return path.join(this.settingsPath, 'settings.json');
  }

  /**
   * 获取引擎目录
   */
  getEnginesPath(): string {
    return this.enginesPath;
  }

  /**
   * 获取日志目录
   */
  getLogsPath(): string {
    return this.logsPath;
  }

  /**
   * 获取特定引擎的默认路径
   */
  getDefaultEnginePath(engineType: EngineType): string {
    const platform = process.platform;
    const isWindows = platform === 'win32';
    const isMac = platform === 'darwin';
    const isLinux = platform === 'linux';

    switch (engineType) {
      case 'gnugo':
        if (isWindows) {
          return path.join(this.enginesPath, 'gnugo', 'gnugo.exe');
        } else if (isMac) {
          return '/usr/local/bin/gnugo';
        } else if (isLinux) {
          return '/usr/bin/gnugo';
        }
        break;

      case 'katago':
        if (isWindows) {
          return path.join(this.enginesPath, 'katago', 'katago.exe');
        } else if (isMac) {
          return path.join(this.enginesPath, 'katago', 'katago');
        } else if (isLinux) {
          return path.join(this.enginesPath, 'katago', 'katago');
        }
        break;

      case 'leela':
        if (isWindows) {
          return path.join(this.enginesPath, 'leela', 'leelaz.exe');
        } else if (isMac) {
          return path.join(this.enginesPath, 'leela', 'leelaz');
        } else if (isLinux) {
          return path.join(this.enginesPath, 'leela', 'leelaz');
        }
        break;

      case 'pachi':
        if (isWindows) {
          return path.join(this.enginesPath, 'pachi', 'pachi.exe');
        } else {
          return path.join(this.enginesPath, 'pachi', 'pachi');
        }

      case 'mock':
        return 'mock'; // Mock引擎不需要实际路径

      case 'custom':
        return ''; // 自定义引擎需要用户指定
    }

    return '';
  }

  /**
   * 检查引擎文件是否存在
   */
  engineExists(enginePath: string): boolean {
    if (enginePath === 'mock') {
      return true; // Mock引擎总是可用
    }

    if (!enginePath || enginePath === '') {
      return false;
    }

    return fs.existsSync(enginePath);
  }

  /**
   * 获取游戏文件路径
   */
  getGameFilePath(filename: string): string {
    // 确保文件名有.sgf扩展名
    if (!filename.endsWith('.sgf')) {
      filename += '.sgf';
    }

    return path.join(this.gamesPath, filename);
  }

  /**
   * 获取日志文件路径
   */
  getLogFilePath(filename: string): string {
    // 确保文件名有.log扩展名
    if (!filename.endsWith('.log')) {
      filename += '.log';
    }

    return path.join(this.logsPath, filename);
  }

  /**
   * 列出所有保存的游戏文件
   */
  listGameFiles(): string[] {
    try {
      const files = fs.readdirSync(this.gamesPath);
      return files.filter((file) => file.endsWith('.sgf'));
    } catch (error) {
      console.error('读取游戏文件列表失败:', error);
      return [];
    }
  }

  /**
   * 删除游戏文件
   */
  deleteGameFile(filename: string): boolean {
    try {
      const filePath = this.getGameFilePath(filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除游戏文件失败:', error);
      return false;
    }
  }

  /**
   * 获取应用版本
   */
  getAppVersion(): string {
    return app.getVersion();
  }

  /**
   * 获取应用名称
   */
  getAppName(): string {
    return app.getName();
  }

  /**
   * 规范化路径（处理不同操作系统的路径分隔符）
   */
  normalizePath(filePath: string): string {
    return path.normalize(filePath);
  }

  /**
   * 解析相对路径为绝对路径
   */
  resolvePath(...paths: string[]): string {
    return path.resolve(...paths);
  }

  /**
   * 获取文件名（不含路径）
   */
  getFileName(filePath: string): string {
    return path.basename(filePath);
  }

  /**
   * 获取文件扩展名
   */
  getFileExtension(filePath: string): string {
    return path.extname(filePath);
  }

  /**
   * 获取目录路径（不含文件名）
   */
  getDirectoryPath(filePath: string): string {
    return path.dirname(filePath);
  }

  /**
   * 检查路径是否为绝对路径
   */
  isAbsolutePath(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  /**
   * 连接路径
   */
  joinPaths(...paths: string[]): string {
    return path.join(...paths);
  }

  /**
   * 创建目录（如果不存在）
   */
  ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * 读取文件内容
   */
  readFile(filePath: string, encoding: BufferEncoding = 'utf8'): string {
    return fs.readFileSync(filePath, encoding);
  }

  /**
   * 写入文件内容
   */
  writeFile(filePath: string, content: string, encoding: BufferEncoding = 'utf8'): void {
    // 确保目录存在
    const dir = path.dirname(filePath);
    this.ensureDirectory(dir);

    fs.writeFileSync(filePath, content, encoding);
  }

  /**
   * 检查文件是否存在
   */
  fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * 获取文件统计信息
   */
  getFileStats(filePath: string): fs.Stats | null {
    try {
      return fs.statSync(filePath);
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取临时目录
   */
  getTempPath(): string {
    return app.getPath('temp');
  }

  /**
   * 获取桌面目录
   */
  getDesktopPath(): string {
    return app.getPath('desktop');
  }

  /**
   * 获取文档目录
   */
  getDocumentsPath(): string {
    return app.getPath('documents');
  }

  /**
   * 获取下载目录
   */
  getDownloadsPath(): string {
    return app.getPath('downloads');
  }

  /**
   * 清理旧日志文件（保留最近N天）
   */
  cleanOldLogs(daysToKeep: number = 7): void {
    try {
      const files = fs.readdirSync(this.logsPath);
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000; // 转换为毫秒

      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logsPath, file);
          const stats = fs.statSync(filePath);
          const age = now - stats.mtime.getTime();

          if (age > maxAge) {
            fs.unlinkSync(filePath);
            console.log(`已删除旧日志文件: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('清理旧日志文件失败:', error);
    }
  }

  /**
   * 获取当前日志文件路径（按日期命名）
   */
  getCurrentLogFilePath(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return this.getLogFilePath(`gosim-${dateStr}.log`);
  }
}
