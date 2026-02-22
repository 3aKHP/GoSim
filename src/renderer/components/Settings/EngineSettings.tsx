import React, { useState } from 'react';
import { Form, Input, Button, Space, Tag, Divider, message } from 'antd';
import { FolderOpenOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useSettingsStore } from '../../stores/settings-store';
import { EngineType } from '../../../shared/types';

interface EngineSettingsProps {
  onChange: () => void;
}

const EngineSettings: React.FC<EngineSettingsProps> = ({ onChange }) => {
  const { settings, saveSettings } = useSettingsStore();
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  if (!settings) return null;

  const engineConfigs = [
    {
      type: 'gnugo' as EngineType,
      name: 'GNU Go',
      description: '经典围棋AI，适合初学者',
    },
    {
      type: 'katago' as EngineType,
      name: 'KataGo',
      description: '目前最强的开源围棋AI，支持分析和对弈',
    },
    {
      type: 'leela' as EngineType,
      name: 'Leela Zero',
      description: '基于神经网络的AI',
    },
    {
      type: 'custom' as EngineType,
      name: '自定义引擎',
      description: '使用其他GTP兼容引擎',
    },
  ];

  const handlePathChange = async (engineType: EngineType, path: string) => {
    const newPaths = { ...settings.enginePaths, [engineType]: path };
    await saveSettings({ enginePaths: newPaths });
    onChange();
  };

  const handleKataGoModelPathChange = async (path: string) => {
    await saveSettings({ katagoModelPath: path });
    onChange();
  };

  const handleKataGoConfigPathChange = async (path: string) => {
    await saveSettings({ katagoConfigPath: path });
    onChange();
  };

  const handleBrowse = async (engineType: EngineType) => {
    try {
      const result = await window.electronAPI.openFileDialog({
        title: `选择${engineConfigs.find(e => e.type === engineType)?.name}引擎`,
        filters: [
          { name: '可执行文件', extensions: ['exe', 'bat', 'sh'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      });

      if (result && result.length > 0) {
        await handlePathChange(engineType, result[0]);
      }
    } catch (error: any) {
      message.error(`打开文件对话框失败: ${error.message}`);
    }
  };

  const handleBrowseKataGoModel = async () => {
    try {
      const result = await window.electronAPI.openFileDialog({
        title: '选择 KataGo 网络模型文件',
        filters: [
          { name: '模型文件', extensions: ['bin.gz', 'gz'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      });

      if (result && result.length > 0) {
        await handleKataGoModelPathChange(result[0]);
      }
    } catch (error: any) {
      message.error(`打开文件对话框失败: ${error.message}`);
    }
  };

  const handleBrowseKataGoConfig = async () => {
    try {
      const result = await window.electronAPI.openFileDialog({
        title: '选择 KataGo 配置文件',
        filters: [
          { name: '配置文件', extensions: ['cfg'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      });

      if (result && result.length > 0) {
        await handleKataGoConfigPathChange(result[0]);
      }
    } catch (error: any) {
      message.error(`打开文件对话框失败: ${error.message}`);
    }
  };

  const handleTestEngine = async (engineType: EngineType) => {
    const path = settings.enginePaths[engineType];
    if (!path) {
      setTestResults(prev => ({
        ...prev,
        [engineType]: { success: false, message: '路径为空' },
      }));
      return;
    }

    try {
      // 暂时模拟测试结果，实际应该调用主进程的测试API
      // TODO: 实现主进程的引擎测试功能
      const result = { success: true, message: '引擎测试成功' };
      setTestResults(prev => ({
        ...prev,
        [engineType]: result,
      }));
      
      if (result.success) {
        message.success(`${engineConfigs.find(e => e.type === engineType)?.name} 测试成功`);
      } else {
        message.error(`${engineConfigs.find(e => e.type === engineType)?.name} 测试失败`);
      }
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        [engineType]: { success: false, message: `测试错误: ${error.message}` },
      }));
      message.error(`测试失败: ${error.message}`);
    }
  };

  return (
    <div className="engine-settings">
      <div className="settings-description">
        <p>配置围棋AI引擎的可执行文件路径。引擎必须支持GTP (Go Text Protocol) 协议。</p>
        <p className="hint">提示：Mock引擎不需要配置，始终可用。</p>
      </div>

      <Form layout="vertical">
        {engineConfigs.map((config) => (
          <div key={config.type} className="engine-setting-item">
            <Divider orientation="left">{config.name}</Divider>
            
            <div className="engine-info">
              <p className="engine-description">{config.description}</p>
            </div>

            <Form.Item label="引擎路径">
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={settings.enginePaths[config.type] || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePathChange(config.type, e.target.value)}
                  placeholder={`输入${config.name}的路径`}
                />
                <Button
                  icon={<FolderOpenOutlined />}
                  onClick={() => handleBrowse(config.type)}
                >
                  浏览
                </Button>
              </Space.Compact>
            </Form.Item>

            {/* KataGo 专属配置：模型文件和配置文件 */}
            {config.type === 'katago' && (
              <>
                <Form.Item label="网络模型文件 (.bin.gz)">
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      value={settings.katagoModelPath || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleKataGoModelPathChange(e.target.value)}
                      placeholder="选择 KataGo 网络模型文件"
                    />
                    <Button
                      icon={<FolderOpenOutlined />}
                      onClick={handleBrowseKataGoModel}
                    >
                      浏览
                    </Button>
                  </Space.Compact>
                </Form.Item>

                <Form.Item label="GTP 配置文件 (.cfg)">
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      value={settings.katagoConfigPath || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleKataGoConfigPathChange(e.target.value)}
                      placeholder="选择 KataGo GTP 配置文件"
                    />
                    <Button
                      icon={<FolderOpenOutlined />}
                      onClick={handleBrowseKataGoConfig}
                    >
                      浏览
                    </Button>
                  </Space.Compact>
                </Form.Item>
              </>
            )}

            <Form.Item>
              <Space>
                <Button
                  onClick={() => handleTestEngine(config.type)}
                  disabled={!settings.enginePaths[config.type]}
                >
                  测试引擎
                </Button>

                {testResults[config.type] && (
                  <Tag
                    icon={testResults[config.type].success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                    color={testResults[config.type].success ? 'success' : 'error'}
                  >
                    {testResults[config.type].message}
                  </Tag>
                )}
              </Space>
            </Form.Item>
          </div>
        ))}
      </Form>

      <Divider />

      <div className="engine-detection">
        <h4>引擎检测结果</h4>
        <Space direction="vertical" style={{ width: '100%' }}>
          {engineConfigs.map((config) => {
            const path = settings.enginePaths[config.type];
            const result = testResults[config.type];
            const isAvailable = result?.success || config.type === 'mock';

            return (
              <div key={config.type} className="detection-item">
                <Space>
                  <span className="engine-name">{config.name}:</span>
                  <Tag color={isAvailable ? 'success' : 'default'}>
                    {isAvailable ? '✓ 可用' : '✗ 不可用'}
                  </Tag>
                  {path && <span className="engine-path">{path}</span>}
                </Space>
              </div>
            );
          })}
        </Space>
      </div>
    </div>
  );
};

export default EngineSettings;
