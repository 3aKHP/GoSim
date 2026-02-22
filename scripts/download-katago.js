/**
 * KataGo 一键下载脚本
 * 下载 KataGo 可执行文件（OpenCL 版本）和轻量级网络模型到 engines/katago/ 目录
 *
 * 用法: node scripts/download-katago.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const KATAGO_VERSION = 'v1.16.4';
const KATAGO_ZIP_URL = `https://github.com/lightvector/KataGo/releases/download/${KATAGO_VERSION}/katago-${KATAGO_VERSION}-opencl-windows-x64.zip`;
// 轻量级 18-block 网络模型（b18c384nbt）来自 katagotraining.org
const MODEL_URL = 'https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b18c384nbt-s9996604416-d4316597426.bin.gz';
const MODEL_FILENAME = 'kata1-b18c384nbt-s9996604416-d4316597426.bin.gz';

const TARGET_DIR = path.join(__dirname, '..', 'engines', 'katago');

/**
 * 跟随重定向下载文件
 */
function downloadFile(url, destPath, label) {
  return new Promise((resolve, reject) => {
    console.log(`[下载] ${label}`);
    console.log(`  URL: ${url}`);
    console.log(`  目标: ${destPath}`);

    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith('https') ? https : http;

    const request = (currentUrl) => {
      protocol.get(currentUrl, { headers: { 'User-Agent': 'GoSim-Downloader' } }, (response) => {
        // 处理重定向
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          console.log(`  重定向到: ${response.headers.location}`);
          const redirectUrl = response.headers.location;
          const redirectProtocol = redirectUrl.startsWith('https') ? https : http;
          redirectProtocol.get(redirectUrl, { headers: { 'User-Agent': 'GoSim-Downloader' } }, (redirectResponse) => {
            if (redirectResponse.statusCode !== 200) {
              reject(new Error(`下载失败，HTTP 状态码: ${redirectResponse.statusCode}`));
              return;
            }

            const totalSize = parseInt(redirectResponse.headers['content-length'], 10);
            let downloadedSize = 0;

            redirectResponse.on('data', (chunk) => {
              downloadedSize += chunk.length;
              if (totalSize) {
                const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
                process.stdout.write(`\r  进度: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(1)}MB / ${(totalSize / 1024 / 1024).toFixed(1)}MB)`);
              }
            });

            redirectResponse.pipe(file);
            file.on('finish', () => {
              file.close();
              console.log('\n  ✓ 下载完成');
              resolve();
            });
          }).on('error', reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`下载失败，HTTP 状态码: ${response.statusCode}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (totalSize) {
            const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
            process.stdout.write(`\r  进度: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(1)}MB / ${(totalSize / 1024 / 1024).toFixed(1)}MB)`);
          }
        });

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('\n  ✓ 下载完成');
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    };

    request(url);
  });
}

/**
 * 解压 ZIP 文件（使用 PowerShell）
 */
function unzipFile(zipPath, destDir) {
  console.log(`[解压] ${zipPath} -> ${destDir}`);
  try {
    execSync(
      `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`,
      { stdio: 'inherit' }
    );
    console.log('  ✓ 解压完成');
  } catch (error) {
    throw new Error(`解压失败: ${error.message}`);
  }
}

/**
 * 生成默认的 GTP 配置文件
 */
function createDefaultConfig(configPath) {
  console.log(`[配置] 生成默认 GTP 配置文件: ${configPath}`);

  const config = `# KataGo GTP 配置文件 (由 GoSim 自动生成)
# 详细配置说明请参考: https://github.com/lightvector/KataGo/blob/master/cpp/configs/gtp_example.cfg

# 搜索线程数（根据你的 CPU 核心数调整）
numSearchThreads = 4

# 每步最大访问次数（越大越强，但越慢）
maxVisits = 500

# 规则设置（中国规则）
rules = chinese
komi = 7.5

# 时间管理
# maxTime = 10.0

# 日志
logDir = engines/katago/logs
logAllGTPCommunication = true
logSearchInfo = true

# 报告分析信息
reportAnalysisWinratesAs = BLACK
`;

  fs.writeFileSync(configPath, config, 'utf8');
  console.log('  ✓ 配置文件已生成');
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log(' GoSim - KataGo 一键下载工具');
  console.log(`  版本: ${KATAGO_VERSION} (OpenCL, Windows x64)`);
  console.log('========================================\n');

  // 1. 创建目标目录
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
    console.log(`[目录] 已创建: ${TARGET_DIR}`);
  }

  // 创建日志目录
  const logsDir = path.join(TARGET_DIR, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // 2. 下载 KataGo 可执行文件
  const zipPath = path.join(TARGET_DIR, `katago-${KATAGO_VERSION}-opencl-windows-x64.zip`);
  const katagoExePath = path.join(TARGET_DIR, 'katago.exe');

  if (fs.existsSync(katagoExePath)) {
    console.log('[跳过] katago.exe 已存在，跳过下载');
  } else {
    await downloadFile(KATAGO_ZIP_URL, zipPath, 'KataGo 可执行文件');

    // 解压
    unzipFile(zipPath, TARGET_DIR);

    // 查找解压后的 katago.exe 并移动到目标位置
    const extractedDir = fs.readdirSync(TARGET_DIR);
    for (const item of extractedDir) {
      const itemPath = path.join(TARGET_DIR, item);
      if (fs.statSync(itemPath).isDirectory() && item.startsWith('katago')) {
        // 移动 exe 到目标目录
        const exeInDir = path.join(itemPath, 'katago.exe');
        if (fs.existsSync(exeInDir)) {
          fs.copyFileSync(exeInDir, katagoExePath);
          console.log(`  ✓ 已将 katago.exe 复制到 ${katagoExePath}`);
        }
        // 复制默认配置文件
        const defaultCfg = path.join(itemPath, 'gtp_example.cfg');
        const targetCfg = path.join(TARGET_DIR, 'gtp_example.cfg');
        if (fs.existsSync(defaultCfg) && !fs.existsSync(targetCfg)) {
          fs.copyFileSync(defaultCfg, targetCfg);
          console.log(`  ✓ 已复制默认配置文件 gtp_example.cfg`);
        }
      }
    }

    // 清理 zip 文件
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
      console.log('  ✓ 已清理 zip 文件');
    }
  }

  // 3. 下载网络模型
  const modelPath = path.join(TARGET_DIR, MODEL_FILENAME);
  // 同时创建一个简短的符号链接名
  const modelLinkPath = path.join(TARGET_DIR, 'model.bin.gz');

  if (fs.existsSync(modelPath) || fs.existsSync(modelLinkPath)) {
    console.log('[跳过] 网络模型已存在，跳过下载');
  } else {
    await downloadFile(MODEL_URL, modelPath, '网络模型 (b18c384nbt, ~60MB)');

    // 创建简短名称的副本
    fs.copyFileSync(modelPath, modelLinkPath);
    console.log(`  ✓ 已创建 model.bin.gz 副本`);
  }

  // 4. 生成默认配置文件
  const configPath = path.join(TARGET_DIR, 'katago.cfg');
  if (!fs.existsSync(configPath)) {
    createDefaultConfig(configPath);
  } else {
    console.log('[跳过] katago.cfg 已存在，跳过生成');
  }

  // 5. 完成
  console.log('\n========================================');
  console.log(' ✓ KataGo 环境搭建完成！');
  console.log('========================================');
  console.log(`  可执行文件: ${katagoExePath}`);
  console.log(`  网络模型:   ${modelLinkPath}`);
  console.log(`  配置文件:   ${configPath}`);
  console.log('\n在 GoSim 设置中配置以上路径即可使用 KataGo。');
}

main().catch((error) => {
  console.error('\n❌ 下载失败:', error.message);
  process.exit(1);
});
