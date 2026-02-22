import React from 'react';
import { Form, Select, Slider, Space, Typography, Divider } from 'antd';
import { useSettingsStore } from '../../stores/settings-store';
import { AIProfile, BoardSize, EngineType } from '../../../shared/types';
import './AISettings.css';

const { Text } = Typography;
const { Option } = Select;

const AISettings: React.FC = () => {
  const { settings, updateBoardSize, updateAIProfile } = useSettingsStore();

  if (!settings) {
    return <div>加载中...</div>;
  }

  const handleBoardSizeChange = async (value: BoardSize) => {
    await updateBoardSize(value);
  };

  const handleBlackEngineChange = async (value: EngineType) => {
    const updatedProfile: AIProfile = {
      ...settings.defaultAIBlack,
      engineType: value,
      name: getEngineName(value),
      enginePath: getEnginePath(value, settings),
    };
    await updateAIProfile('black', updatedProfile);
  };

  const handleBlackStrengthChange = async (value: number) => {
    const updatedProfile: AIProfile = {
      ...settings.defaultAIBlack,
      strength: value,
    };
    await updateAIProfile('black', updatedProfile);
  };

  const handleWhiteEngineChange = async (value: EngineType) => {
    const updatedProfile: AIProfile = {
      ...settings.defaultAIWhite,
      engineType: value,
      name: getEngineName(value),
      enginePath: getEnginePath(value, settings),
    };
    await updateAIProfile('white', updatedProfile);
  };

  const handleWhiteStrengthChange = async (value: number) => {
    const updatedProfile: AIProfile = {
      ...settings.defaultAIWhite,
      strength: value,
    };
    await updateAIProfile('white', updatedProfile);
  };

  // 获取引擎名称
  const getEngineName = (engineType: EngineType): string => {
    const engineNames: Record<EngineType, string> = {
      gnugo: 'GNU Go',
      katago: 'KataGo',
      leela: 'Leela Zero',
      pachi: 'Pachi',
      mock: 'Mock 引擎',
      custom: '自定义引擎',
    };
    return engineNames[engineType] || engineType;
  };

  // 获取引擎路径
  const getEnginePath = (engineType: EngineType, settings: any): string => {
    return settings.enginePaths?.[engineType] || '';
  };

  return (
    <div className="ai-settings">
      <Form layout="vertical" size="small">
        {/* 棋盘大小 */}
        <Form.Item label="棋盘大小">
          <Select
            value={settings.boardSize}
            onChange={handleBoardSizeChange}
            style={{ width: '100%' }}
          >
            <Option value={9}>9×9</Option>
            <Option value={13}>13×13</Option>
            <Option value={19}>19×19</Option>
          </Select>
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        {/* 黑方AI */}
        <Form.Item label={<Text strong>黑方AI</Text>}>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <div>
              <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
                引擎类型
              </Text>
              <Select
                value={settings.defaultAIBlack.engineType}
                onChange={handleBlackEngineChange}
                style={{ width: '100%' }}
              >
                <Option value="mock">Mock 引擎（测试）</Option>
                <Option value="pachi">Pachi</Option>
                <Option value="gnugo">GNU Go</Option>
                <Option value="katago">KataGo</Option>
                <Option value="leela">Leela Zero</Option>
              </Select>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
                强度：{settings.defaultAIBlack.strength}
              </Text>
              <Slider
                min={1}
                max={10}
                value={settings.defaultAIBlack.strength}
                onChange={handleBlackStrengthChange}
                marks={{
                  1: '弱',
                  5: '中',
                  10: '强',
                }}
              />
            </div>
          </Space>
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        {/* 白方AI */}
        <Form.Item label={<Text strong>白方AI</Text>}>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <div>
              <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
                引擎类型
              </Text>
              <Select
                value={settings.defaultAIWhite.engineType}
                onChange={handleWhiteEngineChange}
                style={{ width: '100%' }}
              >
                <Option value="mock">Mock 引擎（测试）</Option>
                <Option value="pachi">Pachi</Option>
                <Option value="gnugo">GNU Go</Option>
                <Option value="katago">KataGo</Option>
                <Option value="leela">Leela Zero</Option>
              </Select>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
                强度：{settings.defaultAIWhite.strength}
              </Text>
              <Slider
                min={1}
                max={10}
                value={settings.defaultAIWhite.strength}
                onChange={handleWhiteStrengthChange}
                marks={{
                  1: '弱',
                  5: '中',
                  10: '强',
                }}
              />
            </div>
          </Space>
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        {/* 其他设置 */}
        <Form.Item label="贴目">
          <Text>{settings.defaultKomi} 目</Text>
        </Form.Item>

        <Form.Item label="让子">
          <Text>{settings.defaultHandicap === 0 ? '无' : `${settings.defaultHandicap} 子`}</Text>
        </Form.Item>
      </Form>
    </div>
  );
};

export default AISettings;
