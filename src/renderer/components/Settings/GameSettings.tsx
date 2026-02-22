import React from 'react';
import { Form, Select, InputNumber, Switch, Divider } from 'antd';
import { useSettingsStore } from '../../stores/settings-store';
import { BoardSize } from '../../../shared/types';

const { Option } = Select;

interface GameSettingsProps {
  onChange: () => void;
}

const GameSettings: React.FC<GameSettingsProps> = ({ onChange }) => {
  const { settings, saveSettings } = useSettingsStore();

  if (!settings) return null;

  const handleChange = async (field: string, value: any) => {
    await saveSettings({ [field]: value });
    onChange();
  };

  return (
    <div className="game-settings">
      <Form layout="vertical">
        <Divider orientation="left">默认棋盘设置</Divider>

        <Form.Item label="默认棋盘大小">
          <Select
            value={settings.boardSize || settings.defaultBoardSize}
            onChange={async (value: BoardSize) => {
              // 同时更新 boardSize 和 defaultBoardSize
              await saveSettings({
                boardSize: value,
                defaultBoardSize: value
              });
              onChange();
            }}
          >
            <Option value={9}>9×9 (适合初学者)</Option>
            <Option value={13}>13×13 (中级练习)</Option>
            <Option value={19}>19×19 (标准比赛)</Option>
          </Select>
        </Form.Item>

        <Form.Item label="默认贴目">
          <Select
            value={settings.defaultKomi}
            onChange={(value) => handleChange('defaultKomi', value)}
          >
            <Option value={0}>0目 (让子棋)</Option>
            <Option value={5.5}>5.5目 (日韩规则)</Option>
            <Option value={6.5}>6.5目 (中国规则)</Option>
            <Option value={7.5}>7.5目 (贴目棋)</Option>
          </Select>
        </Form.Item>

        <Form.Item label="默认让子数">
          <InputNumber
            min={0}
            max={9}
            value={settings.defaultHandicap}
            onChange={(value) => handleChange('defaultHandicap', value || 0)}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item label="默认游戏速度">
          <InputNumber
            min={1}
            max={10}
            value={settings.defaultSpeed}
            onChange={(value) => handleChange('defaultSpeed', value || 5)}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Divider orientation="left">游戏规则</Divider>

        <Form.Item label="允许自杀着法">
          <Switch
            checked={settings.allowSuicide}
            onChange={(checked) => handleChange('allowSuicide', checked)}
          />
          <div className="setting-description">
            允许放置会导致自己棋子被提的着法
          </div>
        </Form.Item>

        <Form.Item label="允许劫争">
          <Switch
            checked={settings.allowKo}
            onChange={(checked) => handleChange('allowKo', checked)}
          />
          <div className="setting-description">
            允许劫争规则
          </div>
        </Form.Item>

        <Form.Item label="自动认输">
          <Switch
            checked={settings.autoResign}
            onChange={(checked) => handleChange('autoResign', checked)}
          />
          <div className="setting-description">
            当胜率低于阈值时自动认输
          </div>
        </Form.Item>
      </Form>
    </div>
  );
};

export default GameSettings;
