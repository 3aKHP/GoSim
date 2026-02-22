import React, { useState } from 'react';
import { Modal, Button, Space, message, Upload, Input } from 'antd';
import { UploadOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import './SGFManager.css';

interface SGFManagerProps {
  visible: boolean;
  onClose: () => void;
}

const SGFManager: React.FC<SGFManagerProps> = ({ visible, onClose }) => {
  const [sgfContent, setSgfContent] = useState<string>('');
  const [filename, setFilename] = useState<string>('');

  // 导入SGF文件
  const handleImport = async (file: File) => {
    try {
      const content = await file.text();
      
      // 调用主进程API导入SGF
      await window.electronAPI.importSGF(content);
      
      message.success('SGF文件导入成功');
      setSgfContent(content);
      setFilename(file.name);
    } catch (error: any) {
      message.error(`导入失败: ${error.message}`);
    }
    
    return false; // 阻止自动上传
  };

  // 导出SGF文件
  const handleExport = async () => {
    try {
      if (!filename) {
        message.warning('请先输入文件名');
        return;
      }

      // 调用主进程API导出SGF
      await window.electronAPI.exportSGF();
      
      message.success('SGF文件导出成功');
    } catch (error: any) {
      message.error(`导出失败: ${error.message}`);
    }
  };

  // 保存当前对局为SGF
  const handleSaveCurrentGame = async () => {
    try {
      if (!filename) {
        message.warning('请先输入文件名');
        return;
      }

      // 调用主进程API保存当前对局
      await window.electronAPI.saveGame(filename);
      
      message.success('对局已保存为SGF文件');
    } catch (error: any) {
      message.error(`保存失败: ${error.message}`);
    }
  };

  return (
    <Modal
      title={
        <div className="sgf-title">
          <FileTextOutlined style={{ marginRight: 8 }} />
          <span>SGF棋谱管理</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
    >
      <div className="sgf-manager">
        {/* 文件名输入 */}
        <div className="sgf-section">
          <h4>文件名</h4>
          <Input
            placeholder="输入SGF文件名（不含扩展名）"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            suffix=".sgf"
          />
        </div>

        {/* 导入导出操作 */}
        <div className="sgf-section">
          <h4>导入/导出</h4>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Upload
              accept=".sgf"
              beforeUpload={handleImport}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />} block>
                从文件导入SGF
              </Button>
            </Upload>

            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={!filename}
              block
            >
              导出当前对局为SGF
            </Button>

            <Button
              icon={<FileTextOutlined />}
              onClick={handleSaveCurrentGame}
              disabled={!filename}
              type="primary"
              block
            >
              保存当前对局
            </Button>
          </Space>
        </div>

        {/* SGF内容预览 */}
        {sgfContent && (
          <div className="sgf-section">
            <h4>SGF内容预览</h4>
            <div className="sgf-preview">
              <pre>{sgfContent}</pre>
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="sgf-section">
          <h4>使用说明</h4>
          <ul className="sgf-instructions">
            <li>SGF (Smart Game Format) 是围棋棋谱的标准格式</li>
            <li>可以导入SGF文件来复盘对局</li>
            <li>可以将当前对局导出为SGF文件保存</li>
            <li>SGF文件可以在其他围棋软件中打开</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default SGFManager;
